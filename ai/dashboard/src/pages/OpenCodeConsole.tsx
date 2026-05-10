import React, { useState, useEffect, useRef } from "react";
import { Card, cn } from "../components/ui/shared";
import { Skill } from "../types";

interface OpenCodeConsoleProps {
    selectedEmployee?: Skill | null;
    systemPrompt?: string;
    initialMessage?: string;
    className?: string;
    disableCard?: boolean;
}

interface ConsoleMessage {
    role: "user" | "assistant" | "system";
    text: string;
    id: string;
}

const QWEN_API = "http://127.0.0.1:4097";

function buildFullSystemPrompt(basePrompt: string | undefined, employee: Skill | null | undefined): string | undefined {
    if (basePrompt) return basePrompt;
    if (employee) return `You are ${employee.codename}, a specialized AI employee (${employee.title}).\n\nRole description: ${employee.description}\n\nStay in character and assist the user specifically using your skills and role boundaries.`;
    return undefined;
}

export default function OpenCodeConsole({ selectedEmployee, systemPrompt, initialMessage, className, disableCard }: OpenCodeConsoleProps) {
    const [messages, setMessages] = useState<ConsoleMessage[]>([]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [connected, setConnected] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const initialSentRef = useRef(false);

    // Check API connectivity
    useEffect(() => {
        const check = async () => {
            try {
                const res = await fetch(QWEN_API, { method: "OPTIONS" });
                setConnected(res.ok);
            } catch {
                setConnected(false);
            }
        };
        check();
        const interval = setInterval(check, 10000);
        return () => clearInterval(interval);
    }, []);

    // Reset on employee change
    useEffect(() => {
        setMessages([]);
        initialSentRef.current = false;
    }, [selectedEmployee]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    // Use refs to always have latest values in closures
    const systemPromptRef = useRef(systemPrompt);
    useEffect(() => { systemPromptRef.current = systemPrompt; }, [systemPrompt]);
    const employeeRef = useRef(selectedEmployee);
    useEffect(() => { employeeRef.current = selectedEmployee; }, [selectedEmployee]);

    const sendQuery = async (promptText: string, overrideSystemPrompt?: string) => {
        const userMsg: ConsoleMessage = {
            role: "user",
            text: promptText,
            id: `user-${Date.now()}`,
        };
        setMessages(prev => [...prev, userMsg]);
        setIsLoading(true);

        const assistantId = `asst-${Date.now()}`;
        setMessages(prev => [...prev, { role: "assistant", text: "", id: assistantId }]);

    const sp = buildFullSystemPrompt(overrideSystemPrompt || systemPromptRef.current, employeeRef.current);
        console.log("[Console] systemPrompt length:", sp?.length ?? 0, "override:", !!overrideSystemPrompt, "ref:", !!systemPromptRef.current);

        try {
            const res = await fetch(`${QWEN_API}/api/query`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    prompt: promptText,
                    systemPrompt: sp,
                    permissionMode: "auto-edit",
                }),
            });

            if (!res.ok || !res.body) {
                throw new Error(`API error: ${res.status}`);
            }

            const reader = res.body.getReader();
            const decoder = new TextDecoder();
            let buffer = "";

            while (true) {
                const { done, value } = await reader.read();

                if (value) {
                    buffer += decoder.decode(value, { stream: true });
                }
                if (done) {
                    buffer += decoder.decode();
                }

                const lines = buffer.split("\n");
                buffer = lines.pop() || "";

                for (const line of lines) {
                    if (!line.trim()) continue;
                    try {
                        const msg = JSON.parse(line);
                        if (msg.type === "done") {
                            setIsLoading(false);
                            continue;
                        }
                        if (msg.type === "error") {
                            setMessages(prev => prev.map(m =>
                                m.id === assistantId ? { ...m, text: m.text + `\n❌ Error: ${msg.data?.message || "Unknown error"}` } : m
                            ));
                            continue;
                        }

                        const data = msg.data;
                        let chunk = "";
                        let replace = false;

                        // Stream events (real-time delta)
                        if (msg.type === "stream_event" && data?.event) {
                            const evt = data.event;
                            if (evt.type === "content_block_delta" && evt.delta) {
                                if (evt.delta.type === "text_delta" && evt.delta.text) {
                                    chunk = evt.delta.text;
                                }
                            }
                        }
                        // Full assistant message (final) — replace
                        else if (msg.type === "assistant" && data?.message?.content) {
                            for (const block of data.message.content) {
                                if (block.type === "text" && block.text) {
                                    chunk += block.text;
                                }
                            }
                            replace = true;
                        }
                        // Result — final
                        else if (msg.type === "result") {
                            if (data?.result) { chunk = data.result; replace = true; }
                            setIsLoading(false);
                        }

                        if (chunk) {
                            setMessages(prev => prev.map(m =>
                                m.id === assistantId ? { ...m, text: replace ? chunk : m.text + chunk } : m
                            ));
                        }
                    } catch {
                        // skip malformed lines
                    }
                }

                if (done) break;
            }
        } catch (err: any) {
            setMessages(prev => prev.map(m =>
                m.id === assistantId ? { ...m, text: m.text || `❌ Connection failed: ${err.message}\n\nMake sure qwen-code-api is running on port 4097.` } : m
            ));
        } finally {
            setIsLoading(false);
        }
    };

    // Auto-send initial message with current system prompt
    useEffect(() => {
        if (initialMessage && connected && !initialSentRef.current) {
            initialSentRef.current = true;
            sendQuery(initialMessage, systemPromptRef.current);
        }
    }, [initialMessage, connected]);

    const handleSubmit = async () => {
        if (!input.trim() || isLoading) return;
        const text = input.trim();
        setInput("");
        await sendQuery(text);
    };

    const content = (
        <>
            {!disableCard && (
                <div className="text-sm text-zinc-600">
                    {selectedEmployee ? selectedEmployee.description : "AI Employee Console"}
                </div>
            )}
            <div className={cn("rounded-xl bg-slate-900 p-4 font-mono text-sm text-stone-300 flex flex-col gap-4 min-h-0", className)}>
                <div className="flex items-center justify-between border-b border-stone-700 pb-3 mb-1 shrink-0">
                    <div className="flex items-center gap-2">
                        <span className="text-stone-400">Agent:</span>
                        <span className="text-orange-400 font-bold">
                            {selectedEmployee?.codename ?? "unknown"}
                        </span>
                        <span
                            className={`inline-block w-2 h-2 rounded-full ${connected ? "bg-emerald-400" : "bg-red-400"}`}
                            title={connected ? "Connected" : "Offline"}
                        />
                    </div>
                    <button
                        onClick={() => setMessages([])}
                        className="bg-stone-800 hover:bg-stone-700 text-stone-300 px-3 py-1 rounded-lg text-xs border border-stone-600 transition-colors flex items-center gap-1 active:scale-95"
                        title="Clear conversation"
                    >
                        <span>+</span> New Chat
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto space-y-4 pr-2 pb-2 min-h-0">
                    {messages.length === 0 && (
                        <div className="text-stone-500 italic">
                            {connected
                                ? "Connected to Qwen Code API. Send a prompt to start."
                                : "⚠️ Qwen Code API not detected on port 4097. Start it with: node server/qwen-code-api.mjs"
                            }
                        </div>
                    )}
                    {messages.map((msg) => (
                        <div key={msg.id} className="flex gap-2">
                            <span className={
                                msg.role === "user"
                                    ? "text-blue-400 font-bold"
                                    : msg.role === "system"
                                        ? "text-zinc-500 font-bold"
                                        : "text-[#ffbd2e] font-bold"
                            }>
                                {msg.role === "user" ? "USER" : msg.role === "system" ? "SYS" : "AGENT"}➜
                            </span>
                            {msg.role === "assistant" && msg.text === "" ? (
                                <span className="animate-pulse text-amber-300">🧠 thinking...</span>
                            ) : (
                                <span className="whitespace-pre-wrap">{msg.text}</span>
                            )}
                        </div>
                    ))}
                    <div ref={messagesEndRef} />
                </div>
                <div className="flex items-start gap-2 border-t border-stone-700 pt-4 shrink-0">
                    <span className="text-green-400 mt-0.5">➜</span>
                    <textarea
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
                        disabled={isLoading || !connected}
                        placeholder={`Type your prompt for ${selectedEmployee?.codename ?? "agent"}... (Shift+Enter for newline)`}
                        className="flex-1 bg-transparent outline-none disabled:opacity-50 resize-none min-h-[24px] max-h-[120px] overflow-y-auto leading-normal py-0"
                        rows={1}
                    />
                </div>
            </div>
        </>
    );

    if (disableCard) {
        return <div className="flex-1 flex flex-col overflow-hidden">{content}</div>;
    }

    return (
        <Card title={selectedEmployee ? `Collaborating with ${selectedEmployee.codename}` : "AI Console"}>
            {content}
        </Card>
    );
}
