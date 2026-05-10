/**
 * Qwen Code API Server
 *
 * Lightweight HTTP server wrapping @qwen-code/sdk for browser consumption.
 * Replaces the old `opencode serve` with direct SDK streaming.
 *
 * Endpoints:
 *   POST /api/query   — Start a query session, streams NDJSON responses
 *   POST /api/abort   — Abort an active query
 */

import { createServer } from "http";
import { readdir, readFile } from "fs/promises";
import { join, resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { query, isSDKAssistantMessage, isSDKResultMessage, isSDKPartialAssistantMessage } from "@qwen-code/sdk";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const DASHBOARD_ROOT = resolve(__dirname, "..");

const PORT = parseInt(process.env.QWEN_CODE_PORT || "4097", 10);
const activeQueries = new Map(); // id -> AbortController

const server = createServer(async (req, res) => {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") { res.writeHead(204); res.end(); return; }

  if (req.method === "POST" && req.url === "/api/query") {
    const body = await readBody(req);
    let parsed;
    try { parsed = JSON.parse(body); } catch { res.writeHead(400); res.end("Invalid JSON"); return; }

    const { prompt: promptText, systemPrompt, cwd, permissionMode, sessionId: resumeId, coreTools } = parsed;
    console.log(`[API] query received, systemPrompt length: ${systemPrompt?.length ?? 0}`);
    if (!promptText) { res.writeHead(400); res.end("Missing 'prompt'"); return; }

    const queryId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const abortController = new AbortController();
    activeQueries.set(queryId, abortController);

    // NDJSON streaming
    res.writeHead(200, { "Content-Type": "application/x-ndjson", "Transfer-Encoding": "chunked" });

    try {
      const q = query({
        prompt: promptText,
        options: {
          cwd: cwd || resolve(process.cwd(), "../../"),
          systemPrompt: systemPrompt
            ? { type: "preset", preset: "qwen_code", append: systemPrompt }
            : { type: "preset", preset: "qwen_code" },
          permissionMode: permissionMode || "auto-edit",
          includePartialMessages: true,
          abortController,
          resume: resumeId || undefined,
          coreTools: coreTools || undefined,
        },
      });

      for await (const msg of q) {
        if (abortController.signal.aborted) break;

        const line = JSON.stringify({ type: msg.type, data: msg }) + "\n";
        res.write(line);
      }

      res.write(JSON.stringify({ type: "done", data: { queryId } }) + "\n");
    } catch (err) {
      res.write(JSON.stringify({ type: "error", data: { message: err.message } }) + "\n");
    } finally {
      activeQueries.delete(queryId);
      res.end();
    }
    return;
  }

  if (req.method === "POST" && req.url === "/api/abort") {
    const body = await readBody(req);
    let parsed;
    try { parsed = JSON.parse(body); } catch { res.writeHead(400); res.end("Invalid JSON"); return; }
    const { queryId } = parsed;
    const ac = activeQueries.get(queryId);
    if (ac) { ac.abort(); activeQueries.delete(queryId); }
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true }));
    return;
  }

  // GET /api/factory-content/:name — single file
  const singleFileMatch = req.method === "GET" && req.url?.match(/^\/api\/factory-content\/([\w-]+)$/);
  if (singleFileMatch) {
    const name = singleFileMatch[1];
    const factoryDir = resolve(DASHBOARD_ROOT, "public/factory");
    const filePath = join(factoryDir, `${name}.md`);
    try {
      const content = await readFile(filePath, "utf-8");
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ filename: name, content }));
    } catch {
      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "File not found" }));
    }
    return;
  }

  // GET /api/factory-content — list all markdown files
  if (req.method === "GET" && req.url === "/api/factory-content") {
    const factoryDir = resolve(DASHBOARD_ROOT, "public/factory");
    try {
      const files = await readdir(factoryDir);
      const mdFiles = files.filter(f => f.endsWith(".md")).sort();
      const result = await Promise.all(
        mdFiles.map(async (name) => {
          const content = await readFile(join(factoryDir, name), "utf-8");
          return { filename: name.replace(/\.md$/, ""), content };
        })
      );
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(result));
    } catch (err) {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify([]));
    }
    return;
  }

  res.writeHead(404);
  res.end("Not found");
});

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => resolve(Buffer.concat(chunks).toString()));
    req.on("error", reject);
  });
}

server.listen(PORT, () => {
  console.log(`[qwen-code-api] Listening on http://127.0.0.1:${PORT}`);
});
