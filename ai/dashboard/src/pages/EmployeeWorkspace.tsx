import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Card, cn } from "../components/ui/shared";
import { SKILLS } from "../data/mockData";
import { Skill, CrewSkill, RequiredInput, buildSystemPrompt } from "../types";
import OpenCodeConsole from "./OpenCodeConsole";

interface EmployeeWorkspaceProps {
    employeeId: string;
}

function BriefingForm({ inputs, onSubmit, onCancel }: {
    inputs: RequiredInput[];
    onSubmit: (data: Record<string, string>) => void;
    onCancel: () => void;
}) {
    const [formData, setFormData] = useState<Record<string, string>>({});

    useEffect(() => {
        const initial: Record<string, string> = {};
        inputs.forEach(i => { initial[i.id] = ""; });
        setFormData(initial);
    }, [inputs]);

    const groups = useMemo(() => {
        const map = new Map<string, RequiredInput[]>();
        for (const input of inputs) {
            const group = input.group || "其他";
            if (!map.has(group)) map.set(group, []);
            map.get(group)!.push(input);
        }
        return map;
    }, [inputs]);

    const missingRequired = inputs.filter(i => i.required && !formData[i.id]?.trim());

    const handleChange = (id: string, value: string) => {
        setFormData(prev => ({ ...prev, [id]: value }));
    };

    return (
        <div className="flex flex-col h-full">
            {/* Scrollable form area */}
            <div className="flex-1 overflow-y-auto px-4 py-4">
                <div className="flex flex-col gap-6 max-w-4xl mx-auto">
                    <div className="text-center space-y-1">
                        <h3 className="text-lg font-bold text-zinc-800">📋 工作需求表</h3>
                        <p className="text-xs text-zinc-500">請填寫以下資料，讓員工知道要做什麼。必填欄位標記 *</p>
                    </div>

                    {Array.from(groups.entries()).map(([groupName, groupInputs]) => (
                        <Card key={groupName} title={groupName} className="p-4">
                            <div className="space-y-4">
                                {groupInputs.map(input => (
                                    <div key={input.id}>
                                        <label className="block text-sm font-semibold text-zinc-700 mb-1">
                                            {input.label}
                                            {input.required && <span className="text-red-500 ml-1">*</span>}
                                        </label>
                                        <p className="text-xs text-zinc-400 mb-1.5">{input.description}</p>
                                        {input.multiline ? (
                                            <textarea
                                                value={formData[input.id] || ""}
                                                onChange={e => handleChange(input.id, e.target.value)}
                                                placeholder={input.placeholder}
                                                rows={6}
                                                className={cn(
                                                    "w-full rounded-xl border bg-zinc-50 px-3 py-2 text-sm font-mono transition-colors",
                                                    "placeholder:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-orange-400",
                                                    input.required && !formData[input.id]?.trim()
                                                        ? "border-red-200 bg-red-50/30"
                                                        : "border-zinc-200"
                                                )}
                                            />
                                        ) : (
                                            <input
                                                type="text"
                                                value={formData[input.id] || ""}
                                                onChange={e => handleChange(input.id, e.target.value)}
                                                placeholder={input.placeholder}
                                                className={cn(
                                                    "w-full rounded-xl border bg-zinc-50 px-3 py-2 text-sm font-mono transition-colors",
                                                    "placeholder:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-orange-400",
                                                    input.required && !formData[input.id]?.trim()
                                                        ? "border-red-200 bg-red-50/30"
                                                        : "border-zinc-200"
                                                )}
                                            />
                                        )}
                                    </div>
                                ))}
                            </div>
                        </Card>
                    ))}
                </div>
            </div>

            {/* Fixed bottom action bar */}
            <div className="flex items-center justify-between px-6 py-3 bg-white border-t border-zinc-200 shrink-0">
                <button
                    onClick={onCancel}
                    className="px-4 py-2 rounded-xl border border-zinc-200 text-sm text-zinc-500 hover:bg-zinc-100 transition-colors"
                >
                    ← 返回
                </button>
                <div className="flex items-center gap-3">
                    {missingRequired.length > 0 ? (
                        <span className="text-xs text-red-400">
                            還有 {missingRequired.length} 個必填欄位未填
                        </span>
                    ) : (
                        <span className="text-xs text-green-500">✅ 資料齊全，可以開始！</span>
                    )}
                    <button
                        onClick={() => onSubmit(formData)}
                        disabled={missingRequired.length > 0}
                        className={cn(
                            "px-6 py-2.5 rounded-xl text-sm font-bold transition-all",
                            missingRequired.length === 0
                                ? "bg-orange-500 text-white hover:bg-orange-600 shadow-sm active:scale-95"
                                : "bg-zinc-100 text-zinc-400 cursor-not-allowed"
                        )}
                    >
                        🚀 開始開發 ({inputs.filter(i => formData[i.id]?.trim()).length}/{inputs.length} 已填)
                    </button>
                </div>
            </div>
        </div>
    );
}

export default function EmployeeWorkspace({ employeeId }: EmployeeWorkspaceProps) {
    const employee = SKILLS.find((s) => s.id === employeeId);
    const [enabledSkills, setEnabledSkills] = useState<Record<string, boolean>>({});
    const [consoleKey, setConsoleKey] = useState(0);
    const [systemPrompt, setSystemPrompt] = useState("");
    const [chatStarted, setChatStarted] = useState(false);
    const [showPromptModal, setShowPromptModal] = useState(false);
    const [showBriefing, setShowBriefing] = useState(false);
    const [formData, setFormData] = useState<Record<string, string>>({});

    useEffect(() => {
        if (employee) {
            const initial: Record<string, boolean> = {};
            employee.skills.forEach(s => { initial[s.id] = s.enabled; });
            setEnabledSkills(initial);
            setConsoleKey(0);
            setChatStarted(false);
            setShowPromptModal(false);
            setShowBriefing(false);
            setFormData({});
            setSystemPrompt(buildSystemPrompt(employee, employee.skills.filter(s => s.enabled).map(s => s.id)));
        }
    }, [employee]);

    const selectedSkillIds = useMemo(() => {
        return Object.entries(enabledSkills)
            .filter(([_, v]) => v)
            .map(([k]) => k);
    }, [enabledSkills]);

    // Collect all requiredInputs from enabled skills
    const allRequiredInputs = useMemo(() => {
        if (!employee) return [];
        const inputs: RequiredInput[] = [];
        for (const skill of employee.skills) {
            if (selectedSkillIds.includes(skill.id) && skill.requiredInputs) {
                inputs.push(...skill.requiredInputs);
            }
        }
        return inputs;
    }, [employee, selectedSkillIds]);

    const handleSkillToggle = useCallback((skillId: string) => {
        setEnabledSkills(prev => {
            const next = { ...prev, [skillId]: !prev[skillId] };
            if (employee) {
                const ids = Object.entries(next).filter(([_, v]) => v).map(([k]) => k);
                setSystemPrompt(buildSystemPrompt(employee, ids));
            }
            return next;
        });
    }, [employee]);

    const handleStartChat = () => {
        // If there are required inputs, show briefing form first
        if (allRequiredInputs.length > 0 && !chatStarted) {
            setShowBriefing(true);
            return;
        }
        // Otherwise start directly
        if (employee) {
            setSystemPrompt(buildSystemPrompt(employee, selectedSkillIds));
            setConsoleKey(prev => prev + 1);
            setChatStarted(true);
        }
    };

    const handleBriefingSubmit = (data: Record<string, string>) => {
        setFormData(data);
        if (employee) {
            // Build label→value map for prompt
            const labelMap: Record<string, string> = {};
            for (const input of allRequiredInputs) {
                if (data[input.id]?.trim()) {
                    labelMap[input.label] = data[input.id];
                }
            }
            const prompt = buildSystemPrompt(employee, selectedSkillIds, labelMap);
            setSystemPrompt(prompt);
        }
        setConsoleKey(prev => prev + 1);
        setChatStarted(true);
        setShowBriefing(false);
    };

    if (!employee) {
        return <div className="p-4 text-red-500">Employee not found.</div>;
    }

    // Show briefing form - full tab page
    if (showBriefing) {
        return (
            <BriefingForm
                inputs={allRequiredInputs}
                onSubmit={handleBriefingSubmit}
                onCancel={() => setShowBriefing(false)}
            />
        );
    }

    return (
        <div className="flex flex-col h-full gap-2">
            {/* Top panel: Employee header and skills */}
            <Card className="flex-none overflow-y-auto p-4">
                <div className="flex gap-6 items-start">
                    {/* Left: Employee Photo */}
                    <div className="w-32 h-32 shrink-0 rounded-2xl overflow-hidden bg-orange-50/50 border border-orange-100 flex items-center justify-center p-3 shadow-sm">
                        <img
                            src={employee.imageUrl}
                            alt={employee.title}
                            className="w-full h-full object-contain drop-shadow-sm"
                        />
                    </div>
                    {/* Right: Details & Skills */}
                    <div className="flex flex-col gap-3 flex-1 min-w-0">
                        <div className="flex justify-between items-start">
                            <div>
                                <h2 className="text-lg font-bold text-stone-800">
                                    {employee.codename}
                                    <span className="text-zinc-400 font-normal text-sm ml-2">({employee.title})</span>
                                </h2>
                                <p className="text-xs text-zinc-500 mt-0.5">{employee.description}</p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0 ml-4">
                                <button
                                    onClick={() => setShowPromptModal(true)}
                                    className="px-3 py-2 rounded-xl border border-zinc-200 text-xs font-medium text-zinc-600 hover:bg-zinc-50 hover:border-zinc-300 transition-all"
                                >
                                    📝 提示詞
                                </button>
                                <button
                                    onClick={handleStartChat}
                                    disabled={selectedSkillIds.length === 0}
                                    className={cn(
                                        "px-4 py-2 rounded-xl text-sm font-bold transition-all",
                                        selectedSkillIds.length > 0
                                            ? "bg-orange-500 text-white hover:bg-orange-600 shadow-sm active:scale-95"
                                            : "bg-zinc-100 text-zinc-400 cursor-not-allowed"
                                    )}
                                >
                                    {allRequiredInputs.length > 0 && !chatStarted
                                        ? `📋 填寫需求 (${selectedSkillIds.length} 技能)`
                                        : `💬 開始對話 (${selectedSkillIds.length} 技能)`
                                    }
                                </button>
                            </div>
                        </div>

                        {/* Skill selection */}
                        <div>
                            <div className="font-semibold text-xs mb-2 text-zinc-600 uppercase tracking-wider">
                                勾選要載入的技能
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {employee.skills.map((skill: CrewSkill) => {
                                    const isSelected = enabledSkills[skill.id] ?? skill.enabled;
                                    const hasInputs = skill.requiredInputs && skill.requiredInputs.length > 0;
                                    return (
                                        <label
                                            key={skill.id}
                                            className={cn(
                                                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs cursor-pointer transition-all",
                                                isSelected
                                                    ? "border-orange-400 bg-orange-50 text-orange-700 shadow-sm"
                                                    : "border-zinc-200 bg-white text-zinc-500 hover:border-zinc-300"
                                            )}
                                        >
                                            <input
                                                type="checkbox"
                                                className="w-3.5 h-3.5 rounded border-zinc-300 accent-orange-500"
                                                checked={isSelected}
                                                onChange={() => handleSkillToggle(skill.id)}
                                            />
                                            <span className="font-medium">{skill.name}</span>
                                            {hasInputs && isSelected && (
                                                <span className="bg-orange-200 text-orange-800 px-1.5 py-0.5 rounded text-[9px]">
                                                    📋 {skill.requiredInputs!.length} 項輸入
                                                </span>
                                            )}
                                        </label>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Form data summary (after submission) */}
                        {chatStarted && Object.keys(formData).length > 0 && (
                            <details className="mt-1">
                                <summary className="text-xs text-zinc-400 cursor-pointer hover:text-zinc-600">
                                    📋 已填寫 {Object.values(formData).filter(v => v.trim()).length}/{allRequiredInputs.length} 項規格資料
                                </summary>
                                <div className="mt-2 grid grid-cols-2 gap-2">
                                    {allRequiredInputs.map(input => (
                                        <div key={input.id} className="text-xs">
                                            <span className="font-medium text-zinc-600">{input.group} → {input.label}:</span>
                                            <span className={formData[input.id]?.trim() ? "text-green-600 ml-1" : "text-red-400 ml-1"}>
                                                {formData[input.id]?.trim() ? "✓ 已填" : "✗ 未填"}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </details>
                        )}
                    </div>
                </div>
            </Card>

            {/* Console area */}
            {chatStarted ? (
                <Card className="flex-1 min-h-0 flex flex-col overflow-hidden p-0 border-0 bg-transparent shadow-none">
                    <OpenCodeConsole
                        key={`console-${consoleKey}`}
                        selectedEmployee={employee}
                        systemPrompt={systemPrompt}
                        className="flex-1 overflow-hidden m-0"
                        disableCard
                    />
                </Card>
            ) : (
                <Card className="flex-1 min-h-0 flex items-center justify-center border-dashed border-2 border-zinc-200 bg-zinc-50/50">
                    <div className="text-center space-y-2">
                        <div className="text-4xl">🤖</div>
                        {allRequiredInputs.length > 0 ? (
                            <div className="text-sm text-zinc-400">
                                點「📋 填寫需求」準備規格資料，再開始開發
                            </div>
                        ) : (
                            <div className="text-sm text-zinc-400">勾選技能後點「開始對話」來啟動 Console</div>
                        )}
                        <details className="mt-4 text-left">
                            <summary className="text-xs text-zinc-400 cursor-pointer hover:text-zinc-600 text-center">
                                📝 預覽 System Prompt ({systemPrompt.length} 字元)
                            </summary>
                            <pre className="bg-zinc-900 text-green-400 p-4 rounded-xl text-[11px] whitespace-pre-wrap font-mono max-h-[300px] overflow-y-auto mt-2">
                                {systemPrompt}
                            </pre>
                        </details>
                    </div>
                </Card>
            )}

            {/* Prompt preview modal */}
            {showPromptModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowPromptModal(false)}>
                    <div className="bg-white rounded-2xl shadow-2xl w-[700px] max-w-[90vw] max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100">
                            <div>
                                <h3 className="text-base font-bold text-zinc-800">📝 System Prompt 預覽</h3>
                                <p className="text-xs text-zinc-400 mt-0.5">
                                    {employee.codename} · {selectedSkillIds.length} 個技能 · {systemPrompt.length} 字元
                                </p>
                            </div>
                            <button
                                onClick={() => setShowPromptModal(false)}
                                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-zinc-100 text-zinc-400 hover:text-zinc-600 transition-colors"
                            >
                                ✕
                            </button>
                        </div>
                        <div className="px-5 py-3 border-b border-zinc-100 flex flex-wrap gap-1.5">
                            {employee.skills.map(s => (
                                <span key={s.id} className={cn(
                                    "text-[10px] px-2 py-1 rounded-full",
                                    selectedSkillIds.includes(s.id)
                                        ? "bg-orange-100 text-orange-700"
                                        : "bg-zinc-100 text-zinc-400 line-through"
                                )}>
                                    {selectedSkillIds.includes(s.id) ? '✓' : '✗'} {s.name}
                                </span>
                            ))}
                        </div>
                        <pre className="flex-1 overflow-y-auto bg-zinc-900 text-green-400 p-5 text-xs whitespace-pre-wrap font-mono rounded-b-2xl">
                            {systemPrompt}
                        </pre>
                    </div>
                </div>
            )}
        </div>
    );
}
