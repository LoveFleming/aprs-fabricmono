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

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const DASHBOARD_ROOT = resolve(__dirname, "..");
const DATA_ROOT = resolve(__dirname, "../../data");

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

  // ── Crew CRUD endpoints ──

  const CREW_DIR = resolve(DATA_ROOT, "crew");

  // Helper: list all crew JSON files
  async function listCrewFiles() {
    await mkdir(CREW_DIR, { recursive: true });
    const files = await readdir(CREW_DIR);
    return files.filter(f => f.endsWith(".json") && !f.includes("conversation")).sort();
  }

  // GET /api/crew — list all crew members
  if (req.method === "GET" && req.url === "/api/crew") {
    try {
      const files = await listCrewFiles();
      const crew = await Promise.all(
        files.map(async (name) => {
          try {
            const raw = await readFile(join(CREW_DIR, name), "utf-8");
            return JSON.parse(raw);
          } catch { return null; }
        })
      );
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(crew.filter(Boolean)));
    } catch (err) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // GET /api/crew/:id — get single crew member
  const crewGetMatch = req.method === "GET" && req.url?.match(/^\/api\/crew\/([\w.-]+)$/);
  if (crewGetMatch) {
    const crewId = crewGetMatch[1];
    try {
      const files = await listCrewFiles();
      let target = null;
      for (const f of files) {
        try {
          const raw = await readFile(join(CREW_DIR, f), "utf-8");
          const data = JSON.parse(raw);
          if (data.id === crewId) { target = f; break; }
        } catch { /* skip */ }
      }
      if (!target) {
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Crew not found" }));
        return;
      }
      const content = await readFile(join(CREW_DIR, target), "utf-8");
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(content);
    } catch (err) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // POST /api/crew — create new crew member
  if (req.method === "POST" && req.url === "/api/crew") {
    const body = await readBody(req);
    let parsed;
    try { parsed = JSON.parse(body); } catch { res.writeHead(400); res.end("Invalid JSON"); return; }
    if (!parsed.id) { res.writeHead(400); res.end("Missing 'id'"); return; }
    if (!parsed.title) { res.writeHead(400); res.end("Missing 'title'"); return; }

    try {
      // Check for duplicate id
      const files = await listCrewFiles();
      for (const f of files) {
        const raw = await readFile(join(CREW_DIR, f), "utf-8");
        const existing = JSON.parse(raw);
        if (existing.id === parsed.id) {
          res.writeHead(409, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: `Crew id '${parsed.id}' already exists` }));
          return;
        }
      }

      // Determine next file number
      const numPrefix = files.length > 0
        ? String(Math.max(...files.map(f => parseInt(f.split("-")[0]) || 0)) + 1).padStart(2, "0")
        : "00";
      const filename = `${numPrefix}-${parsed.id}.json`;
      await writeFile(join(CREW_DIR, filename), JSON.stringify(parsed, null, 4), "utf-8");
      res.writeHead(201, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true, filename, crew: parsed }));
    } catch (err) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // PUT /api/crew/:id — update crew member
  const crewPutMatch = req.method === "PUT" && req.url?.match(/^\/api\/crew\/([\w.-]+)$/);
  if (crewPutMatch) {
    const crewId = crewPutMatch[1];
    const body = await readBody(req);
    let parsed;
    try { parsed = JSON.parse(body); } catch { res.writeHead(400); res.end("Invalid JSON"); return; }

    try {
      const files = await listCrewFiles();
      let targetFile = null;
      for (const f of files) {
        const raw = await readFile(join(CREW_DIR, f), "utf-8");
        const existing = JSON.parse(raw);
        if (existing.id === crewId) { targetFile = f; break; }
      }
      if (!targetFile) {
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Crew not found" }));
        return;
      }
      // Ensure id is not changed
      parsed.id = crewId;
      await writeFile(join(CREW_DIR, targetFile), JSON.stringify(parsed, null, 4), "utf-8");
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true, crew: parsed }));
    } catch (err) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // DELETE /api/crew/:id — delete crew member
  const crewDeleteMatch = req.method === "DELETE" && req.url?.match(/^\/api\/crew\/([\w.-]+)$/);
  if (crewDeleteMatch) {
    const crewId = crewDeleteMatch[1];
    try {
      const files = await listCrewFiles();
      let targetFile = null;
      for (const f of files) {
        const raw = await readFile(join(CREW_DIR, f), "utf-8");
        const existing = JSON.parse(raw);
        if (existing.id === crewId) { targetFile = f; break; }
      }
      if (!targetFile) {
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Crew not found" }));
        return;
      }
      const { unlink } = await import("fs/promises");
      await unlink(join(CREW_DIR, targetFile));
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true }));
    } catch (err) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // ── End Crew CRUD endpoints ──

  // ── Conversation endpoints ──

  // GET /api/conversations/:employeeId — list conversations
  const convListMatch = req.method === "GET" && req.url?.match(/^\/api\/conversations\/([\w.-]+)$/);
  if (convListMatch) {
    const employeeId = convListMatch[1];
    const convDir = resolve(DATA_ROOT, "crew/conversation", employeeId);
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
    const filePath = resolve(DATA_ROOT, "crew/conversation", employeeId, `${convId}.json`);
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
    const convDir = resolve(DATA_ROOT, "crew/conversation", employeeId);
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
    const filePath = resolve(DATA_ROOT, "crew/conversation", employeeId, `${convId}.json`);
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
    const factoryDir = resolve(DATA_ROOT, "factory");
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
    const factoryDir = resolve(DATA_ROOT, "factory");
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

// ── Platform-specific Qwen CLI spawn functions ──

/**
 * macOS: qwen installed via Homebrew
 * Binary path: /opt/homebrew/bin/qwen (Apple Silicon) or /usr/local/bin/qwen (Intel)
 */
function spawnQwenMac(ptySpawn, opts) {
  const { cwd, model, approvalMode, systemPrompt } = opts;
  const args = [];
  if (model) args.push("-m", model);
  if (approvalMode === "yolo") args.push("-y");
  else if (approvalMode) args.push("--approval-mode", approvalMode);
  if (systemPrompt) args.push("--system-prompt", systemPrompt);

  // Try Homebrew paths
  const qwenBin = process.env.QWEN_BIN || "/opt/homebrew/bin/qwen";

  const resolvedCwd = cwd || process.env.QWEN_CWD || resolve(DASHBOARD_ROOT, "../../");

  const ptyOpts = {
    name: "xterm-256color",
    cols: 120,
    rows: 30,
    cwd: resolvedCwd,
    env: { ...process.env },
  };

  console.log(`[PTY:Mac] Spawning: ${qwenBin} ${args.join(" ")} (cwd: ${resolvedCwd})`);
  return ptySpawn(qwenBin, args, ptyOpts);
}

/**
 * Linux (Ubuntu): qwen installed via npm/npx (no Homebrew)
 * Uses PATH to find qwen binary
 */
function spawnQwenLinux(ptySpawn, opts) {
  const { cwd, model, approvalMode, systemPrompt } = opts;
  const args = [];
  if (model) args.push("-m", model);
  if (approvalMode === "yolo") args.push("-y");
  else if (approvalMode) args.push("--approval-mode", approvalMode);
  if (systemPrompt) args.push("--system-prompt", systemPrompt);

  // Linux: use PATH-resolved 'qwen', or override via env var
  const qwenBin = process.env.QWEN_BIN || "qwen";

  const resolvedCwd = cwd || process.env.QWEN_CWD || resolve(DASHBOARD_ROOT, "../../");

  const ptyOpts = {
    name: "xterm-256color",
    cols: 120,
    rows: 30,
    cwd: resolvedCwd,
    env: { ...process.env },
  };

  console.log(`[PTY:Linux] Spawning: ${qwenBin} ${args.join(" ")} (cwd: ${resolvedCwd})`);
  return ptySpawn(qwenBin, args, ptyOpts);
}

/**
 * Windows: qwen installed via npm global
 * Uses qwen.cmd wrapper (npm .cmd shim)
 * node-pty on Windows uses ConPTY
 */
function spawnQwenWindows(ptySpawn, opts) {
  const { cwd, model, approvalMode, systemPrompt } = opts;
  const args = [];
  if (model) args.push("-m", model);
  if (approvalMode === "yolo") args.push("-y");
  else if (approvalMode) args.push("--approval-mode", approvalMode);
  if (systemPrompt) args.push("--system-prompt", systemPrompt);

  // Windows: qwen.cmd is found via PATH
  // If that fails, set QWEN_BIN env var to full path
  const qwenBin = process.env.QWEN_BIN || "qwen.cmd";

  const resolvedCwd = cwd || process.env.QWEN_CWD || resolve(DASHBOARD_ROOT, "../../");

  const ptyOpts = {
    name: "xterm-256color",
    cols: 120,
    rows: 30,
    cwd: resolvedCwd,
    env: { ...process.env },
  };

  console.log(`[PTY:Windows] Spawning: ${qwenBin} ${args.join(" ")} (cwd: ${resolvedCwd})`);
  return ptySpawn(qwenBin, args, ptyOpts);
}

/**
 * Pick the right spawn function for the current platform
 */
function getSpawnFn() {
  const platform = process.platform;
  if (platform === "win32") return spawnQwenWindows;
  if (platform === "darwin") return spawnQwenMac;
  // Linux and others
  return spawnQwenLinux;
}

const spawnQwen = getSpawnFn();
console.log(`[PTY] Platform: ${process.platform}, using ${spawnQwen.name}`);

// ── WebSocket connection handler ──

wss.on("connection", (ws, req) => {
  const sessionId = `pty-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  console.log(`[PTY] New session: ${sessionId}`);

  let spawned = false;

  ws.on("message", (raw) => {
    let msg;
    try { msg = JSON.parse(raw.toString()); } catch {
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
      const old = ptySessions.get(ws);
      if (old?.pty) { old.pty.kill(); }

      try {
        const pty = spawnQwen(ptySpawn, msg.options || {});

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
