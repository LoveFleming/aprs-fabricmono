import React, { useState, useEffect, useRef, useCallback } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import "@xterm/xterm/css/xterm.css";

interface TerminalConsoleProps {
    /** Working directory for the Qwen CLI */
    cwd?: string;
    /** Model to use (passed as -m flag) */
    model?: string;
    /** Approval mode: default | auto-edit | yolo | plan */
    approvalMode?: string;
    /** System prompt override */
    systemPrompt?: string;
    /** Auto-send this prompt after spawn */
    initialPrompt?: string;
    /** Callback when terminal is ready */
    onReady?: () => void;
    /** Callback when terminal exits */
    onExit?: (code: number) => void;
}

const WS_URL = `ws://${window.location.hostname}:4098`;

export default function TerminalConsole({
    cwd,
    model,
    approvalMode = "yolo",
    systemPrompt,
    initialPrompt,
    onReady,
    onExit,
}: TerminalConsoleProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const termRef = useRef<Terminal | null>(null);
    const fitAddonRef = useRef<FitAddon | null>(null);
    const wsRef = useRef<WebSocket | null>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const [input, setInput] = useState("");
    const [connected, setConnected] = useState(false);
    const [ready, setReady] = useState(false);
    const [sessionKilled, setSessionKilled] = useState(false);
    const spawnOptionsRef = useRef({ cwd, model, approvalMode, systemPrompt });
    const initialPromptSentRef = useRef(false);

    // Keep spawn options in sync
    useEffect(() => {
        spawnOptionsRef.current = { cwd, model, approvalMode, systemPrompt };
    }, [cwd, model, approvalMode, systemPrompt]);

    // Initialize xterm.js
    useEffect(() => {
        if (!containerRef.current) return;

        const term = new Terminal({
            theme: {
                background: "#1a1a2e",
                foreground: "#e0e0e0",
                cursor: "#ffbd2e",
                cursorAccent: "#1a1a2e",
                selectionBackground: "#444466",
                black: "#1a1a2e",
                red: "#ff6b6b",
                green: "#51cf66",
                yellow: "#ffbd2e",
                blue: "#5c9eff",
                magenta: "#cc78fa",
                cyan: "#56d4dd",
                white: "#e0e0e0",
                brightBlack: "#666680",
                brightRed: "#ff8787",
                brightGreen: "#69db7c",
                brightYellow: "#ffd43b",
                brightBlue: "#74b0ff",
                brightMagenta: "#d49bfa",
                brightCyan: "#66e0e8",
                brightWhite: "#ffffff",
            },
            fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', Menlo, Monaco, monospace",
            fontSize: 13,
            lineHeight: 1.2,
            cursorBlink: true,
            cursorStyle: "bar",
            scrollback: 10000,
            convertEol: true,
        });

        const fitAddon = new FitAddon();
        term.loadAddon(fitAddon);
        term.open(containerRef.current);

        // Small delay to let the container size settle
        setTimeout(() => {
            try { fitAddon.fit(); } catch { /* ignore */ }
        }, 100);

        termRef.current = term;
        fitAddonRef.current = fitAddon;

        return () => {
            term.dispose();
            termRef.current = null;
            fitAddonRef.current = null;
        };
    }, []);

    // Fit on resize
    useEffect(() => {
        const handleResize = () => {
            if (fitAddonRef.current) {
                try { fitAddonRef.current.fit(); } catch { /* ignore */ }
            }
        };
        window.addEventListener("resize", handleResize);
        // Also observe container size changes
        const observer = new ResizeObserver(handleResize);
        if (containerRef.current) observer.observe(containerRef.current);
        return () => {
            window.removeEventListener("resize", handleResize);
            observer.disconnect();
        };
    }, []);

    // Connect WebSocket and spawn PTY
    const connect = useCallback(() => {
        if (wsRef.current?.readyState === WebSocket.OPEN) return;

        setSessionKilled(false);
        const ws = new WebSocket(WS_URL);
        wsRef.current = ws;

        ws.onopen = () => {
            setConnected(true);
            // Send spawn command
            const opts = spawnOptionsRef.current;
            ws.send(JSON.stringify({
                type: "spawn",
                options: {
                    cwd: opts.cwd,
                    model: opts.model || undefined,
                    approvalMode: opts.approvalMode || "yolo",
                    systemPrompt: opts.systemPrompt || undefined,
                },
            }));
        };

        ws.onmessage = (event) => {
            let msg;
            try { msg = JSON.parse(event.data as string); } catch { return; }

            if (msg.type === "data" && termRef.current) {
                termRef.current.write(msg.data);
            } else if (msg.type === "ready") {
                setReady(true);
                // Resize PTY to match terminal
                if (fitAddonRef.current && termRef.current) {
                    const { cols, rows } = termRef.current;
                    ws.send(JSON.stringify({ type: "resize", cols, rows }));
                }
                onReady?.();
            } else if (msg.type === "exit") {
                setReady(false);
                setConnected(false);
                onExit?.(msg.exitCode || 0);
            } else if (msg.type === "error") {
                if (termRef.current) {
                    termRef.current.write(`\r\n\x1b[31m❌ Error: ${msg.message}\x1b[0m\r\n`);
                }
            }
        };

        ws.onclose = () => {
            setConnected(false);
            setReady(false);
        };

        ws.onerror = () => {
            setConnected(false);
            if (termRef.current) {
                termRef.current.write("\r\n\x1b[31m❌ WebSocket connection failed.\x1b[0m\r\n");
            }
        };
    }, [onReady, onExit]);

    // Connect on mount, disconnect on unmount
    useEffect(() => {
        connect();
        return () => {
            if (wsRef.current) {
                wsRef.current.close();
                wsRef.current = null;
            }
        };
    }, [connect]);

    // Send resize when terminal size changes
    useEffect(() => {
        if (!ready || !wsRef.current) return;
        const term = termRef.current;
        if (!term) return;

        // Send initial resize
        wsRef.current.send(JSON.stringify({
            type: "resize",
            cols: term.cols,
            rows: term.rows,
        }));
    }, [ready]);

    // Auto-send initial prompt
    useEffect(() => {
        if (ready && initialPrompt && !initialPromptSentRef.current) {
            initialPromptSentRef.current = true;
            // Small delay to let Qwen CLI fully initialize
            setTimeout(() => {
                sendInput(initialPrompt);
            }, 1500);
        }
    }, [ready, initialPrompt]);

    // Send text to PTY
    const sendInput = useCallback((text: string) => {
        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
        wsRef.current.send(JSON.stringify({ type: "input", text: text + "\n" }));
    }, []);

    // Handle input box submit
    const handleSubmit = () => {
        const text = input.trim();
        if (!text) return;
        sendInput(text);
        setInput("");
        if (inputRef.current) {
            inputRef.current.style.height = "auto";
        }
    };

    // Restart session
    const handleRestart = () => {
        if (wsRef.current) {
            wsRef.current.send(JSON.stringify({ type: "kill" }));
            wsRef.current.close();
            wsRef.current = null;
        }
        if (termRef.current) {
            termRef.current.clear();
            termRef.current.write("\x1b[33m🔄 Restarting session...\x1b[0m\r\n");
        }
        initialPromptSentRef.current = false;
        setTimeout(() => connect(), 500);
    };

    return (
        <div className="flex flex-col h-full">
            {/* Terminal display */}
            <div
                ref={containerRef}
                className="flex-1 min-h-0 bg-[#1a1a2e] rounded-t-lg overflow-hidden"
                style={{ padding: "4px 4px 0 4px" }}
            />

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
                        onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                                e.preventDefault();
                                handleSubmit();
                                e.currentTarget.style.height = "auto";
                            }
                        }}
                        disabled={!connected || sessionKilled}
                        placeholder={
                            !connected
                                ? "Connecting to Qwen CLI..."
                                : "Type your prompt... (Shift+Enter for newline)"
                        }
                        className="flex-1 bg-transparent outline-none text-stone-200 text-sm disabled:opacity-50 resize-none min-h-[24px] max-h-[120px] overflow-y-auto leading-normal py-0 placeholder-stone-600"
                        rows={1}
                    />
                    <div className="flex gap-1.5 shrink-0">
                        <button
                            onClick={handleRestart}
                            className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-stone-800 text-stone-400 border border-stone-600 hover:bg-stone-700 hover:text-stone-200 transition-colors"
                            title="Restart session"
                        >
                            🔄
                        </button>
                        {connected && ready ? (
                            <button
                                onClick={handleSubmit}
                                disabled={!input.trim()}
                                className="px-3 py-1.5 rounded-lg text-xs font-bold bg-stone-800 text-stone-300 border border-stone-600 hover:bg-stone-700 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                                ▶ Send
                            </button>
                        ) : null}
                    </div>
                </div>
                {/* Connection status */}
                <div className="flex items-center gap-2 mt-1">
                    <span className={`w-2 h-2 rounded-full ${connected && ready ? "bg-green-500" : connected ? "bg-yellow-500 animate-pulse" : "bg-red-500"}`} />
                    <span className="text-[10px] text-stone-500">
                        {connected && ready
                            ? `Qwen CLI ready (${approvalMode})`
                            : connected
                                ? "Starting Qwen CLI..."
                                : "Disconnected"}
                    </span>
                </div>
            </div>
        </div>
    );
}
