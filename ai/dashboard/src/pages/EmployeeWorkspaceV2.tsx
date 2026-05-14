import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Card, cn } from "../components/ui/shared";
import { SKILLS } from "../data/mockData";
import { Skill, CrewSkill, RequiredInput, buildSystemPrompt } from "../types";
import TerminalConsole from "../components/TerminalConsole";
import Icon from "../components/Icon";

interface ModelOption {
    id: string;
    name: string;
    current: boolean;
}

interface ConvSummary {
    id: string;
    title: string;
    createdAt: string;
    updatedAt: string;
    messageCount: number;
    model: string;
}

interface Props {
    employeeId: string;
}

function buildInitialMessage(inputs: RequiredInput[], data: Record<string, string>, skillIds: string[]): string {
    const lines: string[] = [];
    lines.push("## 📄 Source");
    for (const input of inputs) {
        const val = data[input.id]?.trim();
        if (val) lines.push(`**${input.label}:** ${val}`);
    }
    lines.push("---");
    lines.push("Please start working based on the above information.");
    return lines.join("\n");
}

export default function EmployeeWorkspaceV2({ employeeId }: Props) {
    const employee = SKILLS.find((s) => s.id === employeeId);
    const [enabledSkills, setEnabledSkills] = useState<Record<string, boolean>>({});
    const [consoleKey, setConsoleKey] = useState(0);
    const [systemPrompt, setSystemPrompt] = useState("");
    const [chatStarted, setChatStarted] = useState(false);
    const [taskInput, setTaskInput] = useState("");
    const [formData, setFormData] = useState<Record<string, string>>({});
    const [models, setModels] = useState<ModelOption[]>([]);
    const [selectedModel, setSelectedModel] = useState<string>("");
    const [permissionMode, setPermissionMode] = useState<string>("yolo");
    const [selectedCli, setSelectedCli] = useState<string>("qwen");
    const [installedClis, setInstalledClis] = useState<Record<string, { installed: boolean; name: string }>>({});
    const [conversations, setConversations] = useState<ConvSummary[]>([]);
    const [cliTab, setCliTab] = useState<"console" | "logs" | "preview">("console");
    const [showPromptPreview, setShowPromptPreview] = useState(false);

    useEffect(() => {
        fetch("http://127.0.0.1:4097/api/models")
            .then(r => r.json())
            .then(data => {
                const list: ModelOption[] = data.models || [];
                setModels(list);
                const current = list.find((m: ModelOption) => m.current);
                if (current) setSelectedModel(current.id);
            })
            .catch(() => {});
    }, []);

    useEffect(() => {
        fetch("http://127.0.0.1:4097/api/clis")
            .then(r => r.json())
            .then(data => setInstalledClis(data))
            .catch(() => {});
    }, []);

    // Initialize skills
    useEffect(() => {
        if (!employee) return;
        const initial: Record<string, boolean> = {};
        employee.skills.forEach(s => { initial[s.id] = s.enabled; });
        setEnabledSkills(initial);
        setChatStarted(false);
        setFormData({});
    }, [employee]);

    const loadConversations = useCallback(() => {
        if (!employee) return;
        fetch(`http://127.0.0.1:4097/api/conversations/${employee.id}`)
            .then(r => r.json())
            .then(data => setConversations(data.conversations || []))
            .catch(() => {});
    }, [employee]);

    useEffect(() => { loadConversations(); }, [loadConversations]);

    const selectedSkillIds = useMemo(() => {
        return Object.entries(enabledSkills).filter(([_, v]) => v).map(([k]) => k);
    }, [enabledSkills]);

    const effectiveCli = useMemo(() => {
        if (!employee) return "qwen";
        for (const id of selectedSkillIds) {
            const sk = employee.skills.find(s => s.id === id);
            if (sk?.cli) return sk.cli;
        }
        return selectedCli;
    }, [employee, selectedSkillIds, selectedCli]);

    const effectiveModel = useMemo(() => {
        if (!employee) return selectedModel;
        for (const id of selectedSkillIds) {
            const sk = employee.skills.find(s => s.id === id);
            if (sk?.model) return sk.model;
        }
        return selectedModel;
    }, [employee, selectedSkillIds, selectedModel]);

    const effectiveApprovalMode = useMemo(() => {
        if (!employee) return permissionMode;
        for (const id of selectedSkillIds) {
            const sk = employee.skills.find(s => s.id === id);
            if (sk?.approvalMode) return sk.approvalMode;
        }
        return permissionMode;
    }, [employee, selectedSkillIds, permissionMode]);

    const handleStartTask = () => {
        if (!employee || !taskInput.trim()) return;

        // Build system prompt from skills
        const prompt = buildSystemPrompt(employee, selectedSkillIds);
        setSystemPrompt(prompt);
        setFormData(prev => ({ ...prev, task: taskInput.trim() }));
        setConsoleKey(prev => prev + 1);
        setChatStarted(true);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleStartTask();
        }
    };

    // Mock stats
    const stats = [
        { label: "指派任務", value: "12", icon: "chat" as const, color: "text-blue-500" },
        { label: "完成任務", value: "8", icon: "check" as const, color: "text-emerald-500" },
    ];

    if (!employee) return <div className="p-8 text-stone-400">Employee not found</div>;

    const allSkills = employee.skills || [];

    return (
        <div className="flex h-full overflow-hidden">
            {/* ===== Main Content (left ~65%) ===== */}
            <div className="flex-1 flex flex-col overflow-y-auto p-3 gap-2.5 min-w-0">

                {/* --- Profile Banner --- */}
                <Card className="overflow-hidden border border-blue-100 shadow-sm">
                    <div className="flex bg-gradient-to-r from-blue-50 via-white to-indigo-50 min-h-[200px]">
                        {/* Photo — large, spans full banner height */}
                        <div className="w-52 shrink-0 flex items-center justify-center p-3">
                            <img
                                src={employee.imageUrl}
                                alt={employee.title}
                                className="w-full h-full object-contain drop-shadow-lg"
                                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                            />
                        </div>
                        {/* Info — left 60% */}
                        <div className="flex-[3] py-3 pr-2 pl-4 flex flex-col justify-center min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                                <span className="text-2xl font-bold text-stone-800">{employee.codename || employee.title}</span>
                                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-600">AI 員工</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-stone-600 mb-2">
                                <Icon name="gear" size={14} className="text-blue-500" />
                                <span className="font-medium">{employee.title}</span>
                            </div>
                            <p className="text-sm text-stone-500 mb-2 line-clamp-2">{employee.rolePrompt?.split("。")[0]}</p>
                            <div className="flex items-center gap-1.5 text-xs">
                                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                                <span className="text-emerald-600 font-medium">在線上 · 隨時準備協助您</span>
                            </div>
                        </div>
                        {/* Right column — skills + actions, right 40% */}
                        <div className="flex-[2] py-3 pr-4 pl-3 flex flex-col justify-center gap-2.5 min-w-0">
                            {/* Skills — card style with icon */}
                            <div className="bg-white/70 rounded-xl p-3 border border-blue-100">
                                <div className="flex items-center gap-1.5 mb-2">
                                    <div className="w-6 h-6 rounded-lg bg-blue-500 flex items-center justify-center">
                                        <Icon name="lightning" size={12} className="text-white" />
                                    </div>
                                    <span className="text-sm font-bold text-stone-700">Skills</span>
                                    <span className="text-[10px] text-stone-400 ml-auto">{selectedSkillIds.length}/{allSkills.length} 已選</span>
                                </div>
                                <div className="flex flex-wrap gap-1.5">
                                    {allSkills.map(sk => (
                                        <button
                                            key={sk.id}
                                            onClick={() => setEnabledSkills(prev => ({ ...prev, [sk.id]: !prev[sk.id] }))}
                                            className={cn(
                                                "text-sm font-medium px-3 py-1.5 rounded-lg border transition-all flex items-center gap-1.5 whitespace-nowrap",
                                                enabledSkills[sk.id]
                                                    ? "bg-blue-500 text-white border-blue-500 shadow-sm shadow-blue-200"
                                                    : "bg-white text-stone-600 border-stone-200 hover:border-blue-400 hover:bg-blue-50"
                                            )}
                                        >
                                            <Icon name={enabledSkills[sk.id] ? "check" : "gear"} size={12} />
                                            {sk.name}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            {/* Action buttons */}
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setShowPromptPreview(!showPromptPreview)}
                                    className="flex-1 px-3 py-2 rounded-xl text-sm font-medium bg-white border border-stone-200 text-stone-600 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-colors flex items-center justify-center gap-1.5 shadow-sm"
                                >
                                    <Icon name="document" size={14} /> 提示詞
                                </button>
                                <button
                                    onClick={() => { setConsoleKey(prev => prev + 1); setChatStarted(true); }}
                                    className="flex-1 px-3 py-2 rounded-xl text-sm font-bold bg-blue-500 text-white hover:bg-blue-600 transition-colors flex items-center justify-center gap-1.5 shadow-sm shadow-blue-200"
                                >
                                    <Icon name="rocket" size={14} /> 開始
                                </button>
                            </div>
                        </div>
                    </div>
                </Card>

                {/* --- CLI Console --- */}
                <Card className="flex-1 min-h-[400px] flex flex-col border border-stone-200 shadow-sm overflow-hidden">
                    {/* Console header */}
                    <div className="flex items-center justify-between px-4 py-2.5 border-b border-stone-100 bg-stone-50/50">
                        <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center">
                                <span className="text-white text-[10px] font-black">O</span>
                            </div>
                            <div>
                                <span className="font-bold text-stone-700 text-sm">
                                    {effectiveCli === 'claude' ? 'Claude Code' : effectiveCli === 'opencode' ? 'OpenCode' : 'Qwen'} CLI
                                </span>
                                <span className="text-[10px] text-stone-400 ml-2">Embedded developer console</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-1">
                            {/* Mode selector */}
                            <select
                                value={permissionMode}
                                onChange={e => setPermissionMode(e.target.value)}
                                className="px-2 py-1 rounded-lg border border-stone-200 text-[11px] text-stone-500 bg-white"
                                title="Approval Mode"
                            >
                                <option value="default">Default</option>
                                <option value="auto-edit">Auto-Edit</option>
                                <option value="yolo">YOLO</option>
                                <option value="plan">Plan</option>
                            </select>
                            {/* CLI selector */}
                            <select
                                value={selectedCli}
                                onChange={e => setSelectedCli(e.target.value)}
                                className="px-2 py-1 rounded-lg border border-stone-200 text-[11px] text-stone-500 bg-white"
                                title="CLI Engine"
                            >
                                {Object.entries(installedClis).map(([key, info]: [string, any]) => (
                                    <option key={key} value={key} disabled={!info.installed}>
                                        {info.name} {info.installed ? '' : '(未安裝)'}
                                    </option>
                                ))}
                            </select>
                            {/* Model selector */}
                            {models.length > 0 && (
                                <select
                                    value={selectedModel}
                                    onChange={e => setSelectedModel(e.target.value)}
                                    className="px-2 py-1 rounded-lg border border-stone-200 text-[11px] text-stone-500 bg-white max-w-[160px] truncate"
                                >
                                    {models.map(m => (
                                        <option key={m.id} value={m.id}>
                                            {m.name.length > 25 ? m.name.slice(0, 25) + '...' : m.name}
                                        </option>
                                    ))}
                                </select>
                            )}
                            <button
                                onClick={() => setShowPromptPreview(!showPromptPreview)}
                                className="px-2 py-1 rounded-lg border border-stone-200 text-[11px] text-stone-500 hover:bg-stone-100 transition-colors flex items-center gap-1"
                            >
                                <Icon name="document" size={11} /> Prompt
                            </button>
                        </div>
                    </div>

                    {/* Console tabs */}
                    <div className="flex border-b border-stone-100 px-4">
                        {(["console", "logs", "preview"] as const).map(tab => (
                            <button
                                key={tab}
                                onClick={() => setCliTab(tab)}
                                className={cn(
                                    "px-3 py-1.5 text-xs font-medium transition-colors border-b-2 -mb-px",
                                    cliTab === tab
                                        ? "border-blue-500 text-blue-600"
                                        : "border-transparent text-stone-400 hover:text-stone-600"
                                )}
                            >
                                {tab.charAt(0).toUpperCase() + tab.slice(1)}
                            </button>
                        ))}
                    </div>

                    {/* Terminal */}
                    <div className="flex-1 min-h-0">
                        {cliTab === "console" ? (
                            <TerminalConsole
                                key={`terminal-${consoleKey}`}
                                cwd={undefined}
                                cli={effectiveCli}
                                model={effectiveModel || undefined}
                                approvalMode={effectiveApprovalMode}
                                systemPrompt={undefined}
                                initialPrompt={chatStarted ? [
                                    systemPrompt ? `# System Instructions\n${systemPrompt}` : '',
                                    taskInput ? `# Task\n${taskInput}` : '',
                                ].filter(Boolean).join('\n\n') : undefined}
                            />
                        ) : cliTab === "logs" ? (
                            <div className="h-full flex items-center justify-center text-stone-400 text-sm bg-stone-900">
                                <div className="text-center">
                                    <Icon name="document" size={24} className="mx-auto mb-2 opacity-30" />
                                    <p>Logs will appear here</p>
                                </div>
                            </div>
                        ) : (
                            showPromptPreview && systemPrompt ? (
                                <div className="h-full overflow-auto p-4 bg-stone-50">
                                    <pre className="text-xs text-stone-600 whitespace-pre-wrap font-mono">{systemPrompt}</pre>
                                </div>
                            ) : (
                                <div className="h-full flex items-center justify-center text-stone-400 text-sm bg-stone-50">
                                    <div className="text-center">
                                        <Icon name="document" size={24} className="mx-auto mb-2 opacity-30" />
                                        <p>Start a task to preview prompt</p>
                                    </div>
                                </div>
                            )
                        )}
                    </div>
                </Card>
            </div>

            {/* ===== Right Sidebar (~30%) ===== */}
            <div className="w-72 shrink-0 border-l border-stone-100 bg-white/80 overflow-y-auto p-3 flex flex-col gap-2.5">

                {/* Overview Stats */}
                <Card className="p-3 border border-stone-100 shadow-sm">
                    <h3 className="font-bold text-stone-700 text-sm mb-0.5">概覽</h3>
                    <p className="text-[10px] text-stone-400 mb-2">今日工作概要</p>
                    <div className="grid grid-cols-2 gap-2">
                        {stats.map(s => (
                            <div key={s.label} className="bg-stone-50 rounded-xl p-3 text-center">
                                <div className="flex items-center justify-center gap-1 mb-1">
                                    <Icon name={s.icon} size={12} className={s.color} />
                                    <span className="text-lg font-bold text-stone-800">{s.value}</span>
                                </div>
                                <span className="text-[10px] text-stone-500">{s.label}</span>
                            </div>
                        ))}
                    </div>
                </Card>

                {/* Recent Conversations */}
                <Card className="p-3 border border-stone-100 shadow-sm flex-1">
                    <div className="flex items-center justify-between mb-1.5">
                        <h3 className="font-bold text-stone-700 text-sm">最近對話</h3>
                        <span className="text-[10px] text-blue-500 cursor-pointer hover:text-blue-700">查看全部</span>
                    </div>
                    {conversations.length === 0 ? (
                        <div className="space-y-2">
                            <div className="flex items-center justify-between py-2 border-b border-stone-50">
                                <span className="text-xs text-stone-500">如何建立新的微服務？</span>
                                <span className="text-[10px] text-stone-300">10:15</span>
                            </div>
                            <div className="flex items-center justify-between py-2 border-b border-stone-50">
                                <span className="text-xs text-stone-500">工廠的部署流程是什麼？</span>
                                <span className="text-[10px] text-stone-300">昨天</span>
                            </div>
                            <div className="flex items-center justify-between py-2">
                                <span className="text-xs text-stone-500">如何設定權限與角色？</span>
                                <span className="text-[10px] text-stone-300">昨天</span>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {conversations.slice(0, 3).map(c => (
                                <div key={c.id} className="flex items-center justify-between py-2 border-b border-stone-50 last:border-0">
                                    <span className="text-xs text-stone-500 truncate flex-1">{c.title}</span>
                                    <span className="text-[10px] text-stone-300 shrink-0 ml-2">
                                        {new Date(c.updatedAt).toLocaleDateString('zh-TW', { month: 'short', day: 'numeric' })}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </Card>

                {/* Quote — pinned to bottom */}
                <Card className="p-4 border border-blue-100 bg-gradient-to-br from-blue-50 to-indigo-50 shadow-sm relative overflow-hidden mt-auto">
                    <div className="absolute top-2 right-3 text-5xl text-blue-200/40 font-serif">"</div>
                    <p className="text-sm text-stone-600 italic leading-relaxed relative z-10">
                        導入創新，萬機皆服務，萬事皆連結。
                    </p>
                    <p className="text-[10px] text-blue-400 mt-2 font-medium">— AI Software Factory</p>
                </Card>
            </div>
        </div>
    );
}
