import React, { useState, useEffect, useRef } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
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

const WS_PORT = 4098;

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
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const termContainerRef = useRef<HTMLDivElement>(null);
    const [input, setInput] = useState("");
    const [connected, setConnected] = useState(false);
    const [ready, setReady] = useState(false);
    const [directMode, setDirectMode] = useState(true); // default: direct terminal input
    // Stable refs for values used in closures
    const wsRef = useRef<WebSocket | null>(null);
    const termRef = useRef<Terminal | null>(null);
    const fitRef = useRef<FitAddon | null>(null);
    const initialSentRef = useRef(false);
    const mountedRef = useRef(true);

    // Helper: connect WebSocket + spawn PTY, returns the ws
    const connectAndSpawn = (term: Terminal, fit: FitAddon): WebSocket => {
        const wsUrl = `ws://${window.location.hostname}:${WS_PORT}`;
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
            if (!mountedRef.current) return;
            setConnected(true);
            ws.send(JSON.stringify({
                type: "spawn",
                options: {
                    cwd: cwd || undefined,
                    model: model || undefined,
                    approvalMode: approvalMode || "yolo",
                    systemPrompt: systemPrompt || undefined,
                },
            }));
        };

        ws.onmessage = (event) => {
            if (!mountedRef.current) return;
            let msg;
            try { msg = JSON.parse(event.data as string); } catch { return; }

            if (msg.type === "data") {
                term.write(msg.data);
            } else if (msg.type === "ready") {
                setReady(true);
                ws.send(JSON.stringify({ type: "resize", cols: term.cols, rows: term.rows }));
                onReady?.();
            } else if (msg.type === "exit") {
                setReady(false);
                setConnected(false);
                onExit?.(msg.exitCode || 0);
            } else if (msg.type === "error") {
                term.write(`\r\n\x1b[31m❌ Error: ${msg.message}\x1b[0m\r\n`);
            }
        };

        ws.onclose = () => {
            if (!mountedRef.current) return;
            setConnected(false);
            setReady(false);
        };

        ws.onerror = () => {
            if (!mountedRef.current) return;
            setConnected(false);
            term.write("\r\n\x1b[31m❌ WebSocket connection failed.\x1b[0m\r\n");
        };

        return ws;
    };

    // Single useEffect: init terminal + connect WS + spawn PTY
    useEffect(() => {
        mountedRef.current = true;
        const el = containerRef.current;
        if (!el) return;

        // 1. Create terminal
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

        const fit = new FitAddon();
        term.loadAddon(fit);
        term.open(el);
        setTimeout(() => { try { fit.fit(); } catch { /* */ } }, 50);

        termRef.current = term;
        fitRef.current = fit;

        // Direct keyboard input: xterm → PTY (arrow keys, Tab, interactive menus all work)
        term.onData((data) => {
            if (directMode && wsRef.current?.readyState === WebSocket.OPEN) {
                wsRef.current.send(JSON.stringify({ type: "input", text: data }));
            }
        });

        // Fit on resize
        const onResize = () => { try { fit.fit(); } catch { /* */ } };
        window.addEventListener("resize", onResize);
        const observer = new ResizeObserver(onResize);
        observer.observe(el);

        // 2. Connect WebSocket
        connectAndSpawn(term, fit);

        // 3. Cleanup
        return () => {
            mountedRef.current = false;
            observer.disconnect();
            window.removeEventListener("resize", onResize);
            wsRef.current?.close();
            wsRef.current = null;
            term.dispose();
            termRef.current = null;
            fitRef.current = null;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Mount once

    // Auto-send initial prompt (separate effect to avoid re-spawning)
    useEffect(() => {
        if (!ready || !initialPrompt || initialSentRef.current) return;
        initialSentRef.current = true;
        const timer = setTimeout(() => {
            if (wsRef.current?.readyState === WebSocket.OPEN) {
                const text = initialPrompt;
                let i = 0;
                const typeChar = () => {
                    if (i < text.length && wsRef.current?.readyState === WebSocket.OPEN) {
                        wsRef.current.send(JSON.stringify({ type: "input", text: text[i] }));
                        i++;
                        setTimeout(typeChar, 50);
                    } else if (i >= text.length) {
                        setTimeout(() => {
                            if (wsRef.current?.readyState === WebSocket.OPEN) {
                                wsRef.current.send(JSON.stringify({ type: "input", text: "\r" }));
                            }
                        }, 100);
                    }
                };
                typeChar();
            }
        }, 5000);
        return () => clearTimeout(timer);
    }, [ready, initialPrompt]);

    // Send text to PTY (for textarea mode)
    const sendInput = (text: string) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            let i = 0;
            const typeChar = () => {
                if (i < text.length && wsRef.current?.readyState === WebSocket.OPEN) {
                    wsRef.current.send(JSON.stringify({ type: "input", text: text[i] }));
                    i++;
                    setTimeout(typeChar, 30);
                } else if (i >= text.length) {
                    setTimeout(() => {
                        if (wsRef.current?.readyState === WebSocket.OPEN) {
                            wsRef.current.send(JSON.stringify({ type: "input", text: "\r" }));
                        }
                    }, 50);
                }
            };
            typeChar();
        }
    };

    const handleSubmit = () => {
        const text = input.trim();
        if (!text) return;
        sendInput(text);
        setInput("");
        if (inputRef.current) inputRef.current.style.height = "auto";
    };

    const handleRestart = () => {
        if (wsRef.current) {
            wsRef.current.send(JSON.stringify({ type: "kill" }));
            wsRef.current.close();
            wsRef.current = null;
        }
        if (termRef.current) {
            termRef.current.clear();
            termRef.current.write("\x1b[33m🔄 Restarting...\x1b[0m\r\n");
        }
        initialSentRef.current = false;
        setReady(false);
        setConnected(false);

        setTimeout(() => {
            if (!mountedRef.current) return;
            if (termRef.current && fitRef.current) {
                connectAndSpawn(termRef.current, fitRef.current);
            }
        }, 500);
    };

    const toggleMode = () => {
        const newMode = !directMode;
        setDirectMode(newMode);
        // Focus terminal when switching to direct mode
        if (newMode && termRef.current) {
            termRef.current.focus();
        }
        // Focus textarea when switching to textarea mode
        if (!newMode && inputRef.current) {
            inputRef.current.focus();
        }
    };

    return (
        <div className="flex flex-col h-full">
            {/* Terminal display */}
            <div
                ref={containerRef}
                className={`flex-1 min-h-0 bg-[#1a1a2e] ${directMode ? "rounded-t-lg" : "rounded-t-lg"} overflow-hidden`}
                style={{ padding: "4px 4px 0 4px" }}
                onClick={() => {
                    // Click on terminal focuses it in direct mode
                    if (directMode && termRef.current) termRef.current.focus();
                }}
            />

            {/* Input area */}
            <div className="shrink-0 border-t border-stone-700 bg-[#1a1a2e] px-3 py-2 rounded-b-lg">
                {!directMode ? (
                    /* Textarea input mode */
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
                            disabled={!connected || !ready}
                            placeholder={
                                !connected ? "Connecting..." :
                                !ready ? "Starting Qwen CLI..." :
                                "Type your prompt... (Shift+Enter for newline)"
                            }
                            className="flex-1 bg-transparent outline-none text-stone-200 text-sm disabled:opacity-50 resize-none min-h-[24px] max-h-[120px] overflow-y-auto leading-normal py-0 placeholder-stone-600"
                            rows={1}
                        />
                        <div className="flex gap-1.5 shrink-0">
                            <button
                                onClick={handleSubmit}
                                disabled={!connected || !ready || !input.trim()}
                                className="px-3 py-1.5 rounded-lg text-xs font-bold bg-stone-800 text-stone-300 border border-stone-600 hover:bg-stone-700 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                                ▶ Send
                            </button>
                        </div>
                    </div>
                ) : (
                    /* Direct mode hint */
                    <div className="flex items-center gap-2">
                        <span className="text-green-400 text-sm">⌨️</span>
                        <span className="text-stone-500 text-xs">
                            Direct terminal mode — click terminal and type directly. Arrow keys, Tab, and interactive menus work.
                        </span>
                    </div>
                )}
                <div className="flex items-center justify-between mt-1">
                    <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full shrink-0 ${connected && ready ? "bg-green-500" : connected ? "bg-yellow-500 animate-pulse" : "bg-red-500"}`} />
                        <span className="text-[10px] text-stone-500">
                            {connected && ready ? `Qwen CLI ready (${approvalMode})` :
                             connected ? "Starting Qwen CLI..." : "Disconnected"}
                        </span>
                    </div>
                    <div className="flex gap-1.5">
                        <button
                            onClick={toggleMode}
                            className="px-2 py-1 rounded text-[10px] font-bold bg-stone-800 text-stone-400 border border-stone-600 hover:bg-stone-700 hover:text-stone-200 transition-colors"
                            title={directMode ? "Switch to textarea input" : "Switch to direct terminal input"}
                        >
                            {directMode ? "📝 Textarea" : "⌨️ Direct"}
                        </button>
                        <button
                            onClick={handleRestart}
                            className="px-2 py-1 rounded text-[10px] font-bold bg-stone-800 text-stone-400 border border-stone-600 hover:bg-stone-700 hover:text-stone-200 transition-colors"
                            title="Restart session"
                        >
                            🔄
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
