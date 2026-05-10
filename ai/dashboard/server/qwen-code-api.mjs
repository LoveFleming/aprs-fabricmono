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
import { readdir, readFile, writeFile, mkdir } from "fs/promises";
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
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") { res.writeHead(204); res.end(); return; }

  if (req.method === "POST" && req.url === "/api/query") {
    const body = await readBody(req);
    let parsed;
    try { parsed = JSON.parse(body); } catch { res.writeHead(400); res.end("Invalid JSON"); return; }

    const { prompt: promptText, systemPrompt, cwd, permissionMode, sessionId: resumeId, coreTools, model } = parsed;
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
          model: model || undefined,
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

  // GET /api/models — list available models from ~/.qwen/settings.json
  if (req.method === "GET" && req.url === "/api/models") {
    try {
      const homeDir = process.env.HOME || process.env.USERPROFILE;
      const settingsPath = join(homeDir, ".qwen/settings.json");
      const raw = await readFile(settingsPath, "utf-8");
      const settings = JSON.parse(raw);
      const providers = settings.modelProviders || {};
      const models = [];
      const currentModel = settings.model?.name || "";
      for (const [, list] of Object.entries(providers)) {
        if (!Array.isArray(list)) continue;
        for (const m of list) {
          models.push({
            id: m.id,
            name: m.name,
            contextWindowSize: m.generationConfig?.contextWindowSize,
            vision: m.capabilities?.vision || false,
            current: m.id === currentModel,
          });
        }
      }
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ models, currentModel }));
    } catch (err) {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ models: [], currentModel: "", error: err.message }));
    }
    return;
  }

  // ── Conversation endpoints ──

  // GET /api/conversations/:employeeId — list conversations
  const convListMatch = req.method === "GET" && req.url?.match(/^\/api\/conversations\/([\w.-]+)$/);
  if (convListMatch) {
    const employeeId = convListMatch[1];
    const convDir = resolve(DASHBOARD_ROOT, "public/crew/conversation", employeeId);
    try {
      await mkdir(convDir, { recursive: true });
      const files = await readdir(convDir);
      const jsonFiles = files.filter(f => f.endsWith(".json")).sort().reverse();
      const conversations = await Promise.all(
        jsonFiles.map(async (name) => {
          try {
            const raw = await readFile(join(convDir, name), "utf-8");
            const data = JSON.parse(raw);
            return {
              id: name.replace(/\.json$/, ""),
              title: data.title || name.replace(/\.json$/, ""),
              createdAt: data.createdAt,
              updatedAt: data.updatedAt || data.createdAt,
              messageCount: data.messages?.length || 0,
              model: data.model || "",
            };
          } catch { return null; }
        })
      );
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(conversations.filter(Boolean)));
    } catch (err) {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify([]));
    }
    return;
  }

  // GET /api/conversations/:employeeId/:convId — load a conversation
  const convGetMatch = req.method === "GET" && req.url?.match(/^\/api\/conversations\/([\w.-]+)\/([\w.-]+)$/);
  if (convGetMatch) {
    const [, employeeId, convId] = convGetMatch;
    const filePath = resolve(DASHBOARD_ROOT, "public/crew/conversation", employeeId, `${convId}.json`);
    try {
      const content = await readFile(filePath, "utf-8");
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(content);
    } catch {
      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Conversation not found" }));
    }
    return;
  }

  // POST /api/conversations/:employeeId — save a conversation
  const convSaveMatch = req.method === "POST" && req.url?.match(/^\/api\/conversations\/([\w.-]+)$/);
  if (convSaveMatch) {
    const employeeId = convSaveMatch[1];
    const body = await readBody(req);
    let parsed;
    try { parsed = JSON.parse(body); } catch { res.writeHead(400); res.end("Invalid JSON"); return; }
    const { id, title, messages, model, systemPrompt } = parsed;
    if (!id) { res.writeHead(400); res.end("Missing 'id'"); return; }
    const convDir = resolve(DASHBOARD_ROOT, "public/crew/conversation", employeeId);
    await mkdir(convDir, { recursive: true });
    const filePath = join(convDir, `${id}.json`);
    const data = {
      id,
      employeeId,
      title: title || id,
      messages,
      model: model || "",
      systemPrompt: systemPrompt || "",
      createdAt: parsed.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await writeFile(filePath, JSON.stringify(data, null, 2), "utf-8");
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true, id }));
    return;
  }

  // DELETE /api/conversations/:employeeId/:convId — delete a conversation
  const convDeleteMatch = req.method === "DELETE" && req.url?.match(/^\/api\/conversations\/([\w.-]+)\/([\w.-]+)$/);
  if (convDeleteMatch) {
    const [, employeeId, convId] = convDeleteMatch;
    const filePath = resolve(DASHBOARD_ROOT, "public/crew/conversation", employeeId, `${convId}.json`);
    const { unlink } = await import("fs/promises");
    try {
      await unlink(filePath);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true }));
    } catch {
      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Conversation not found" }));
    }
    return;
  }

  // ── End Conversation endpoints ──

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
