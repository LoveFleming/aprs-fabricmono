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
import { WebSocketServer } from "ws";
import { spawn as cpSpawn } from "child_process";
import { createInterface } from "readline";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const DASHBOARD_ROOT = resolve(__dirname, "..");

const PORT = parseInt(process.env.QWEN_CODE_PORT || "4097", 10);
const activeQueries = new Map(); // id -> AbortController
const pendingApprovals = new Map(); // queryId -> { resolve, toolName, toolInput, requestId }

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

    // Helper: ask the browser for approval via the NDJSON stream
    const askBrowserApproval = async (toolName, toolInput) => {
      const requestId = `approval-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      return new Promise((resolve) => {
        pendingApprovals.set(queryId, { resolve, toolName, toolInput, requestId });
        // Send approval_request event to the browser
        res.write(JSON.stringify({
          type: "approval_request",
          data: { queryId, requestId, toolName, toolInput },
        }) + "\n");
      });
    };

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
          permissionMode: permissionMode || "default",
          includePartialMessages: true,
          abortController,
          resume: resumeId || undefined,
          coreTools: coreTools || undefined,
          model: model || undefined,
          canUseTool: async (toolName, toolInput) => {
            console.log(`[API] canUseTool: ${toolName}`);
            return await askBrowserApproval(toolName, toolInput);
          },
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
      // Reject any pending approvals so the SDK doesn't hang
      const pending = pendingApprovals.get(queryId);
      if (pending) {
        pending.resolve({ behavior: "deny", message: "Query ended." });
        pendingApprovals.delete(queryId);
      }
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

  // POST /api/approve — resolve a pending approval request from the browser
  if (req.method === "POST" && req.url === "/api/approve") {
    const body = await readBody(req);
    let parsed;
    try { parsed = JSON.parse(body); } catch { res.writeHead(400); res.end("Invalid JSON"); return; }
    const { queryId, requestId, approved, modifiedInput } = parsed;
    const pending = pendingApprovals.get(queryId);
    if (!pending || pending.requestId !== requestId) {
      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "No pending approval for this query/request" }));
      return;
    }
    if (approved) {
      pending.resolve({ behavior: "allow", updatedInput: modifiedInput || pending.toolInput });
    } else {
      pending.resolve({ behavior: "deny", message: "User denied this tool use." });
    }
    pendingApprovals.delete(queryId);
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

// ── WebSocket server for PTY (Qwen CLI) ──
const WS_PORT = parseInt(process.env.QWEN_WS_PORT || "4098", 10);
const wss = new WebSocketServer({ port: WS_PORT, host: "0.0.0.0" });
const ptySessions = new Map(); // ws -> { pty, id }

// Path to qwen CLI (auto-detect for Windows)
const QWEN_BIN = process.env.QWEN_BIN || (process.platform === "win32" ? "qwen.cmd" : "/opt/homebrew/bin/qwen");

wss.on("connection", (ws, req) => {
  const sessionId = `pty-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  console.log(`[PTY] New session: ${sessionId}`);

  // We don't spawn PTY immediately — wait for a "spawn" message
  // so the client can send options (cwd, model, approvalMode, systemPrompt)

  ws.on("message", (raw) => {
    let msg;
    try { msg = JSON.parse(raw.toString()); } catch {
      // If not JSON, treat as raw input to PTY
      const session = ptySessions.get(ws);
      if (session?.process) session.process.stdin.write(raw.toString());
      return;
    }

    if (msg.type === "spawn") {
      // Clean up previous PTY if any
      const old = ptySessions.get(ws);
      if (old?.pty) { old.pty.kill(); }

      const { cwd, model, approvalMode, systemPrompt } = msg.options || {};
      const args = [];
      if (model) { args.push("-m", model); }
      if (approvalMode === "yolo") { args.push("-y"); }
      else if (approvalMode) { args.push("--approval-mode", approvalMode); }
      if (systemPrompt) { args.push("--system-prompt", systemPrompt); }

      console.log(`[PTY] Spawning: ${QWEN_BIN} ${args.join(" ")} (cwd: ${cwd || "default"})`);

      try {
        const isWin = process.platform === "win32";

        // Spawn qwen directly with color-friendly env vars
        // No PTY needed — xterm.js handles ANSI escape codes natively
        const child = cpSpawn(QWEN_BIN, args, {
          cwd: cwd || resolve(process.cwd(), "../../"),
          env: {
            ...process.env,
            TERM: "xterm-256color",
            COLORTERM: "truecolor",
            FORCE_COLOR: "1",
            // Windows-specific
            ...(isWin ? { ConEmuANSI: "ON" } : {}),
          },
          stdio: ["pipe", "pipe", "pipe"],
          ...(isWin ? { shell: true } : {}),
        });

        console.log(`[PTY] Spawned on ${isWin ? "Windows" : "macOS/Linux"}`);

        ptySessions.set(ws, { process: child, id: sessionId });

        // Forward stdout to browser
        child.stdout.on("data", (data) => {
          if (ws.readyState === 1) {
            ws.send(JSON.stringify({ type: "data", data: data.toString("utf8") }));
          }
        });

        // Forward stderr to browser
        child.stderr.on("data", (data) => {
          if (ws.readyState === 1) {
            ws.send(JSON.stringify({ type: "data", data: data.toString("utf8") }));
          }
        });

        child.on("close", (exitCode) => {
          console.log(`[PTY] Exited: ${sessionId} (code: ${exitCode})`);
          if (ws.readyState === 1) {
            ws.send(JSON.stringify({ type: "exit", exitCode: exitCode || 0 }));
          }
          ptySessions.delete(ws);
        });

        child.on("error", (err) => {
          console.error(`[PTY] Process error:`, err.message);
          ws.send(JSON.stringify({ type: "error", message: err.message }));
        });

        ws.send(JSON.stringify({ type: "ready", sessionId }));
      } catch (err) {
        console.error(`[PTY] Spawn failed:`, err.message);
        ws.send(JSON.stringify({ type: "error", message: `Failed to start Qwen CLI: ${err.message}. Make sure qwen is installed.` }));
      }
    }
    else if (msg.type === "input") {
      // Send text to PTY stdin
      const session = ptySessions.get(ws);
      if (session?.process) {
        session.process.stdin.write(msg.text || "");
      }
    }
    else if (msg.type === "resize") {
      const session = ptySessions.get(ws);
      // resize not supported for child_process, but that's OK
      // The CLI will still work fine
    }
    else if (msg.type === "kill") {
      const session = ptySessions.get(ws);
      if (session?.process) {
        session.process.kill();
        ptySessions.delete(ws);
      }
    }
  });

  ws.on("close", () => {
    const session = ptySessions.get(ws);
    if (session?.process) {
      console.log(`[PTY] Connection closed, killing: ${session.id}`);
      session.process.kill();
      ptySessions.delete(ws);
    }
  });

  ws.on("error", (err) => {
    console.error(`[PTY] WebSocket error:`, err.message);
  });
});

console.log(`[PTY-WS] WebSocket server listening on ws://127.0.0.1:${WS_PORT}`);
