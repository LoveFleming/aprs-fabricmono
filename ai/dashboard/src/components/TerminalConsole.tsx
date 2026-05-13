import React, { useState, useRef, useCallback, useEffect } from "react";
import "@xterm/xterm/css/xterm.css";

interface TerminalConsoleProps {
    cwd?: string;
    model?: string;
    approvalMode?: string;
    systemPrompt?: string;
    initialPrompt?: string;
    onReady?: () => void;
    onExit?: (code: number) => void;
}

const API_PORT = 4097;

export default function TerminalConsole({
    cwd,
    model,
    approvalMode = "yolo",
    systemPrompt,
    initialPrompt,
    onReady,
    onExit,
}: TerminalConsoleProps) {
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const outputRef = useRef<HTMLPreElement>(null);
    const [input, setInput] = useState("");
    const [output, setOutput] = useState("Welcome to AI Factory Console. Type your prompt below.\n");
    const [loading, setLoading] = useState(false);
    const [connected, setConnected] = useState(false);
    const abortRef = useRef<AbortController | null>(null);
    const mountedRef = useRef(true);

    // Check API connectivity on mount
    useEffect(() => {
        mountedRef.current = true;
        const check = async () => {
            try {
                const res = await fetch(`http://${window.location.hostname}:${API_PORT}/api/models`);
                if (res.ok) {
                    setConnected(true);
                    onReady?.();
                }
            } catch {
                setConnected(false);
                appendOutput("\n⚠️ Cannot connect to Qwen API server on port " + API_PORT + ". Make sure the server is running.\n");
            }
        };
        check();
        return () => { mountedRef.current = false; };
    }, []);

    // Auto-scroll output
    useEffect(() => {
        if (outputRef.current) {
            outputRef.current.scrollTop = outputRef.current.scrollHeight;
        }
    }, [output]);

    const appendOutput = (text: string) => {
        setOutput(prev => prev + text);
    };

    // Send query to Qwen API
    const sendQuery = useCallback(async (prompt: string) => {
        if (!prompt.trim() || !mountedRef.current) return;

        const trimmed = prompt.trim();
        appendOutput(`\n\x1b[32m➜\x1b[0m ${trimmed}\n`);
        setInput("");
        if (inputRef.current) inputRef.current.style.height = "auto";
        setLoading(true);

        const ac = new AbortController();
        abortRef.current = ac;

        try {
            const res = await fetch(`http://${window.location.hostname}:${API_PORT}/api/query`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    prompt: trimmed,
                    cwd: cwd || undefined,
                    permissionMode: approvalMode === "yolo" ? "auto" : "default",
                    systemPrompt: systemPrompt || undefined,
                    model: model || undefined,
                }),
                signal: ac.signal,
            });

            if (!res.ok || !res.body) {
                appendOutput(`\n❌ API error: ${res.status} ${res.statusText}\n`);
                setLoading(false);
                return;
            }

            // Stream NDJSON response
            const reader = res.body.getReader();
            const decoder = new TextDecoder();
            let buffer = "";

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                if (!mountedRef.current) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split("\n");
                buffer = lines.pop() || ""; // keep incomplete line

                for (const line of lines) {
                    if (!line.trim()) continue;
                    try {
                        const msg = JSON.parse(line);
                        handleMessage(msg);
                    } catch {
                        // skip malformed JSON
                    }
                }
            }
            // Process remaining buffer
            if (buffer.trim()) {
                try {
                    handleMessage(JSON.parse(buffer));
                } catch { /* skip */ }
            }
        } catch (err: any) {
            if (err.name === "AbortError") {
                appendOutput("\n\x1b[33m⏹ Stopped.\x1b[0m\n");
            } else {
                appendOutput(`\n❌ Error: ${err.message}\n`);
            }
        } finally {
            setLoading(false);
            abortRef.current = null;
        }
    }, [cwd, model, approvalMode, systemPrompt]);

    // Handle streamed messages from Qwen SDK
    const handleMessage = (msg: any) => {
        if (!mountedRef.current) return;

        const data = msg.data || msg;

        switch (msg.type) {
            case "assistant":
            case "partial_assistant": {
                // Text content from assistant
                const text = extractText(data);
                if (text) {
                    // For partial, we replace last assistant block; for full, append new
                    setOutput(prev => {
                        const marker = "\n---ASSISTANT---\n";
                        const lastIdx = prev.lastIndexOf(marker);
                        if (lastIdx !== -1 && msg.type === "partial_assistant") {
                            return prev.substring(0, lastIdx + marker.length) + text;
                        }
                        return prev + marker + text;
                    });
                }
                break;
            }
            case "result": {
                // Final result
                const text = extractText(data);
                if (text) appendOutput("\n" + text + "\n");
                break;
            }
            case "approval_request": {
                // Tool approval needed
                appendOutput(`\n\x1b[33m🔧 Tool: ${data.toolName}\x1b[0m\n`);
                // Auto-approve in yolo mode
                if (approvalMode === "yolo" && data.queryId) {
                    fetch(`http://${window.location.hostname}:${API_PORT}/api/approve`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            queryId: data.queryId,
                            requestId: data.requestId,
                            approved: true,
                        }),
                    });
                }
                break;
            }
            case "done":
                appendOutput("\n");
                break;
            case "error":
                appendOutput(`\n❌ ${data.message || JSON.stringify(data)}\n`);
                break;
            default:
                // Unknown message type, try to extract text
                const t = extractText(data);
                if (t) appendOutput(t);
                break;
        }
    };

    // Extract text from various SDK message formats
    const extractText = (data: any): string => {
        if (!data) return "";
        if (typeof data === "string") return data;
        if (data.text) return data.text;
        if (data.content) {
            if (typeof data.content === "string") return data.content;
            if (Array.isArray(data.content)) {
                return data.content
                    .filter((c: any) => c.type === "text")
                    .map((c: any) => c.text || "")
                    .join("");
            }
        }
        if (data.message?.content) {
            if (typeof data.message.content === "string") return data.message.content;
            if (Array.isArray(data.message.content)) {
                return data.message.content
                    .filter((c: any) => c.type === "text")
                    .map((c: any) => c.text || "")
                    .join("");
            }
        }
        return "";
    };

    const handleStop = () => {
        if (abortRef.current) {
            abortRef.current.abort();
        }
    };

    const handleClear = () => {
        setOutput("Console cleared.\n");
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            if (!loading && input.trim()) {
                sendQuery(input);
            }
        }
    };

    // Auto-send initial prompt
    useEffect(() => {
        if (connected && initialPrompt && !loading) {
            const timer = setTimeout(() => {
                sendQuery(initialPrompt);
            }, 1000);
            return () => clearTimeout(timer);
        }
    }, [connected, initialPrompt]);

    return (
        <div className="flex flex-col h-full">
            {/* Output area */}
            <pre
                ref={outputRef}
                className="flex-1 min-h-0 bg-[#1a1a2e] rounded-t-lg overflow-auto p-3 text-sm text-stone-200 font-mono leading-relaxed whitespace-pre-wrap break-words"
                style={{ scrollBehavior: "smooth" }}
            >
                {output}
                {loading && <span className="text-yellow-400 animate-pulse">▊</span>}
            </pre>

            {/* Input area */}
            <div className="shrink-0 border-t border-stone-700 bg-[#1a1a2e] px-3 py-2 rounded-b-lg">
                <div className="flex items-end gap-2">
                    <span className="text-green-400 mt-1 text-sm shrink-0">➜</span>
                    <textarea
                        ref={inputRef}
                        value={input}
                        onChange={(e) => {
                            setInput(e.target.value);
                            e.target.style.height = "auto";
                            e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
                        }}
                        onKeyDown={handleKeyDown}
                        disabled={!connected}
                        placeholder={
                            !connected ? "Connecting to Qwen API..." :
                            loading ? "Waiting for response..." :
                            "Type your prompt... (Shift+Enter for newline)"
                        }
                        className="flex-1 bg-transparent outline-none text-stone-200 text-sm disabled:opacity-50 resize-none min-h-[24px] max-h-[120px] overflow-y-auto leading-normal py-0 placeholder-stone-600"
                        rows={1}
                    />
                    <div className="flex gap-1.5 shrink-0">
                        {loading ? (
                            <button
                                onClick={handleStop}
                                className="px-3 py-1.5 rounded-lg text-xs font-bold bg-red-900 text-red-300 border border-red-700 hover:bg-red-800 transition-colors"
                                title="Stop current response"
                            >
                                ⏹ Stop
                            </button>
                        ) : (
                            <button
                                onClick={() => input.trim() && sendQuery(input)}
                                disabled={!connected || !input.trim()}
                                className="px-3 py-1.5 rounded-lg text-xs font-bold bg-stone-800 text-stone-300 border border-stone-600 hover:bg-stone-700 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                                ▶ Send
                            </button>
                        )}
                    </div>
                </div>
                <div className="flex items-center justify-between mt-1">
                    <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full shrink-0 ${connected ? "bg-green-500" : "bg-red-500"}`} />
                        <span className="text-[10px] text-stone-500">
                            {connected ? (loading ? "Thinking..." : `Qwen API ready (${approvalMode})`) : "Disconnected"}
                        </span>
                    </div>
                    <div className="flex gap-1.5">
                        <button
                            onClick={handleClear}
                            className="px-2 py-1 rounded text-[10px] font-bold bg-stone-800 text-stone-400 border border-stone-600 hover:bg-stone-700 hover:text-stone-200 transition-colors"
                            title="Clear console output"
                        >
                            🗑 Clear
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
