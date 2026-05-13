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
import { spawn as ptySpawn } from "node-pty";
import { execSync } from "child_process";

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

  // POST /api/hello-world — Hello World AI Node Demo
  if (req.method === "POST" && req.url === "/api/hello-world") {
    const body = await readBody(req);
    let parsed;
    try {
      parsed = JSON.parse(body);
    } catch {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({
        errorCode: "BIZ_HELLO_WORLD_REQUEST_INVALID",
        errorType: "VALIDATION",
        message: "Invalid JSON format"
      }));
      return;
    }

    const { traceId, name, language } = parsed;

    // Validate Input Contract
    if (!traceId || typeof traceId !== "string" || traceId.length === 0) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({
        errorCode: "BIZ_HELLO_WORLD_REQUEST_INVALID",
        errorType: "VALIDATION",
        message: "traceId is required and must be a non-empty string"
      }));
      return;
    }

    // Process greeting
    const greetings = {
      en: "Hello",
      zh: "你好",
      ja: "こんにちは",
      es: "¡Hola",
    };

    const lang = language || "en";
    const greeting = greetings[lang] || greetings["en"];
    const displayName = (name || "World").trim();

    // Build Output Contract response
    const response = {
      traceId,
      greeting,
      message: `${greeting}, ${displayName}! Welcome to AI Software Factory 🏭`,
      language: lang,
      timestamp: new Date().toISOString(),
      nodeInfo: {
        nodeId: "hello-world-node",
        version: "1.0.0",
        factory: "ai-factory",
      },
    };

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(response));
    return;
  }

  // GET /api/hello-world — Health check
  if (req.method === "GET" && req.url === "/api/hello-world") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({
      status: "healthy",
      nodeId: "hello-world-node",
      version: "1.0.0",
      factory: "ai-factory",
    }));
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

// Resolve qwen CLI binary
// Resolve qwen binary at startup
const qwenResolve = await (async () => {
  if (process.env.QWEN_BIN) return { cmd: process.env.QWEN_BIN, args: [] };
  if (process.platform !== "win32") return { cmd: "/opt/homebrew/bin/qwen", args: [] };
  // Windows: bypass qwen.cmd by spawning node directly with the JS entry
  const { existsSync, readFileSync } = await import("fs");
  const nodeExe = process.execPath;
  const appData = process.env.APPDATA || "";
  const nodeDir = dirname(nodeExe);

  // Try to parse qwen.cmd to find the actual entry point
  const cmdCandidates = [
    join(appData, "npm", "qwen.cmd"),
    join(nodeDir, "qwen.cmd"),
  ];
  for (const cmdPath of cmdCandidates) {
    if (existsSync(cmdPath)) {
      try {
        const content = readFileSync(cmdPath, "utf-8");
        // Typical npm .cmd content: node "%~dp0\node_modules\@qwen-code\qwen-code\cli.js" %*
        // or: node "%~dp0\..\..\...\dist\index.js"
        const match = content.match(/node\s+["']?(%~dp0[\\/][^"'\s]+)["']?/i);
        if (match) {
          // Replace %~dp0 with the cmd's directory
          const cmdDir = dirname(cmdPath);
          let jsPath = match[1].replace(/%~dp0/i, cmdDir);
          // Normalize path
          jsPath = resolve(jsPath);
          if (existsSync(jsPath)) {
            console.log(`[QWEN] Parsed from ${cmdPath}: node ${jsPath}`);
            return { cmd: nodeExe, args: [jsPath] };
          }
        }
        // Try another pattern: "%~dp0\..\.."
        const match2 = content.match(/node\s+["']?([^"'\s]+\.js)["']?/i);
        if (match2) {
          let jsPath = match2[1].replace(/%~dp0/i, dirname(cmdPath));
          jsPath = resolve(jsPath);
          if (existsSync(jsPath)) {
            console.log(`[QWEN] Parsed from ${cmdPath}: node ${jsPath}`);
            return { cmd: nodeExe, args: [jsPath] };
          }
        }
      } catch (e) {
        console.warn(`[QWEN] Failed to parse ${cmdPath}:`, e.message);
      }
    }
  }

  // Hardcoded candidates as fallback
  const candidates = [
    join(nodeDir, "node_modules", "@qwen-code", "qwen-code", "cli.js"),
    join(appData, "npm", "node_modules", "@qwen-code", "qwen-code", "dist", "index.js"),
    join(appData, "npm", "node_modules", "@qwen-code", "qwen-code", "cli.js"),
    join(appData, "npm", "node_modules", "@anthropic-ai", "qwen-code", "dist", "cli.js"),
    join(nodeDir, "node_modules", "@anthropic-ai", "qwen-code", "dist", "cli.js"),
  ];
  for (const p of candidates) {
    if (existsSync(p)) {
      console.log(`[QWEN] Resolved Windows entry: node ${p}`);
      return { cmd: nodeExe, args: [p] };
    }
  }
  console.warn(`[QWEN] Could not find qwen JS entry, falling back to qwen.cmd`);
  return { cmd: "qwen.cmd", args: [] };
})();

wss.on("connection", (ws, req) => {
  const sessionId = `pty-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  console.log(`[PTY] New session: ${sessionId}`);

  let spawned = false; // Guard: only spawn once per WS connection

  ws.on("message", (raw) => {
    let msg;
    try { msg = JSON.parse(raw.toString()); } catch {
      // If not JSON, treat as raw input to PTY
      const session = ptySessions.get(ws);
      if (session?.pty) session.pty.write(raw.toString());
      return;
    }

    if (msg.type === "spawn") {
      if (spawned) {
        console.log(`[PTY] Ignoring duplicate spawn for ${sessionId}`);
        return;
      }
      spawned = true;
      // Clean up previous PTY if any
      const old = ptySessions.get(ws);
      if (old?.pty) { old.pty.kill(); }

      const { cwd, model, approvalMode, systemPrompt } = msg.options || {};
      const baseArgs = [...qwenResolve.args];
      const args = [...baseArgs];
      if (model) { args.push("-m", model); }
      if (approvalMode === "yolo") { args.push("-y"); }
      else if (approvalMode) { args.push("--approval-mode", approvalMode); }
      if (systemPrompt) { args.push("--system-prompt", systemPrompt); }

      console.log(`[PTY] Spawning: ${qwenResolve.cmd} ${args.join(" ")} (cwd: ${cwd || "default"})`);

      try {
        const isWin = process.platform === "win32";

        // Use node-pty on all platforms (Ink TUI requires a real PTY)
        const ptyOpts = {
          name: "xterm-256color",
          cols: 120,
          rows: 30,
          cwd: cwd || resolve(process.cwd(), "../../"),
          env: { ...process.env },
        };

        let spawnCmd = qwenResolve.cmd;
        let spawnArgs = args;
        if (isWin && qwenResolve.args.length > 0) {
          // Windows: use 'node' from PATH, pass JS path as plain arg (node-pty handles escaping)
          spawnCmd = 'node';
          spawnArgs = [qwenResolve.args[0], ...args.slice(1)];
          console.log(`[PTY] Windows spawn: node ${spawnArgs[0]}`);
        }

        const pty = ptySpawn(spawnCmd, spawnArgs, ptyOpts);

        ptySessions.set(ws, { pty, id: sessionId });

        pty.onData((data) => {
          if (ws.readyState === 1) {
            ws.send(JSON.stringify({ type: "data", data }));
          }
        });

        pty.onExit(({ exitCode }) => {
          console.log(`[PTY] Exited: ${sessionId} (code: ${exitCode})`);
          if (ws.readyState === 1) {
            ws.send(JSON.stringify({ type: "exit", exitCode }));
          }
          ptySessions.delete(ws);
        });

        ws.send(JSON.stringify({ type: "ready", sessionId }));
      } catch (err) {
        console.error(`[PTY] Spawn failed:`, err.message);
        ws.send(JSON.stringify({ type: "error", message: `Failed to start Qwen CLI: ${err.message}` }));
      }
    }
    else if (msg.type === "input") {
      const session = ptySessions.get(ws);
      if (session?.pty) {
        session.pty.write(msg.text || "");
      }
    }
    else if (msg.type === "resize") {
      const session = ptySessions.get(ws);
      if (session?.pty && msg.cols && msg.rows) {
        session.pty.resize(msg.cols, msg.rows);
      }
    }
    else if (msg.type === "kill") {
      const session = ptySessions.get(ws);
      if (session?.pty) {
        session.pty.kill();
        ptySessions.delete(ws);
      }
    }
  });

  ws.on("close", () => {
    const session = ptySessions.get(ws);
    if (session?.pty) {
      console.log(`[PTY] Connection closed, killing: ${session.id}`);
      session.pty.kill();
      ptySessions.delete(ws);
    }
  });

  ws.on("error", (err) => {
    console.error(`[PTY] WebSocket error:`, err.message);
  });
});

console.log(`[PTY-WS] WebSocket server listening on ws://127.0.0.1:${WS_PORT}`);
