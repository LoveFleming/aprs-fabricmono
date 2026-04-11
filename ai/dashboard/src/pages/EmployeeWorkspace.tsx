import React, { useState, useEffect } from "react";
import { Card, cn } from "../components/ui/shared";
import { loadCrew, CrewSkill } from "../data/crew";
import OpenCodeConsole from "./OpenCodeConsole";

interface InputField {
    key: string;
    label: string;
    placeholder?: string;
    type: "text" | "textarea" | "select";
    options?: string[];
    required?: boolean;
}

interface SkillDef {
    name: string;
    inputFields?: InputField[];
}

interface EmployeeWorkspaceProps {
    employeeId: string;
}

export default function EmployeeWorkspace({ employeeId }: EmployeeWorkspaceProps) {
    const [employee, setEmployee] = useState<CrewSkill | null>(null);
    const [loading, setLoading] = useState(true);
    const [consoleKey, setConsoleKey] = useState(0);
    const [showPromptDetail, setShowPromptDetail] = useState(false);
    const [showConversation, setShowConversation] = useState(false);
    const [selectedSkillIdx, setSelectedSkillIdx] = useState<number>(-1);
    const [initialPrompt, setInitialPrompt] = useState("");
    const [inputValues, setInputValues] = useState<Record<string, string>>({});

    useEffect(() => {
        loadCrew().then((data) => {
            const found = data.find((s) => s.id === employeeId);
            setEmployee(found ?? null);
            setLoading(false);
        });
    }, [employeeId]);

    // Reset when employee changes
    useEffect(() => {
        setShowConversation(false);
        setSelectedSkillIdx(-1);
        setInputValues({});
        setInitialPrompt("");
    }, [employeeId]);

    if (loading) {
        return <div className="p-4 text-zinc-400 text-sm">Loading employee...</div>;
    }

    if (!employee) {
        return <div className="p-4 text-red-500">Employee not found.</div>;
    }

    const emp = employee as any;
    const promptTemplate: string = emp.promptTemplate || "";

    // Skills can be either string[] (old format) or SkillDef[] (new format)
    const skills: SkillDef[] = (emp.skills || []).map((s: any) =>
        typeof s === "string" ? { name: s } : s
    );

    const selectedSkill = selectedSkillIdx >= 0 ? skills[selectedSkillIdx] : null;
    const currentInputFields: InputField[] = selectedSkill?.inputFields || [];

    const updateInput = (key: string, value: string) => {
        setInputValues((prev) => ({ ...prev, [key]: value }));
    };

    const buildPromptFromFields = (): string => {
        let parts: string[] = [];
        if (selectedSkill) {
            parts.push(`【使用技能】${selectedSkill.name}`);
        }
        for (const field of currentInputFields) {
            const val = inputValues[field.key]?.trim();
            if (val) {
                parts.push(`【${field.label}】\n${val}`);
            }
        }
        if (initialPrompt.trim()) {
            parts.push(`【補充說明】\n${initialPrompt.trim()}`);
        }
        return parts.join("\n\n");
    };

    const hasRequiredFields = (): boolean => {
        if (!selectedSkill) return false;
        for (const field of currentInputFields) {
            if (field.required && !inputValues[field.key]?.trim()) {
                return false;
            }
        }
        return true;
    };

    const handleSelectSkill = (idx: number) => {
        if (idx === selectedSkillIdx) return;
        setSelectedSkillIdx(idx);
        setInputValues({});
        setInitialPrompt("");
    };

    const handleStartConversation = () => {
        setConsoleKey((prev) => prev + 1);
        setShowConversation(true);
    };

    const handleStartNewChat = () => {
        setConsoleKey((prev) => prev + 1);
    };

    const renderField = (field: InputField) => {
        const value = inputValues[field.key] || "";
        const baseClass = "w-full bg-white border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-300 transition";

        if (field.type === "textarea") {
            return (
                <textarea
                    placeholder={field.placeholder || ""}
                    value={value}
                    onChange={(e) => updateInput(field.key, e.target.value)}
                    className={cn(baseClass, "h-20 p-2.5 resize-none")}
                />
            );
        }
        if (field.type === "select" && field.options) {
            return (
                <select
                    value={value}
                    onChange={(e) => updateInput(field.key, e.target.value)}
                    className={cn(baseClass, "px-3 py-2")}
                >
                    <option value="">-- 請選擇 --</option>
                    {field.options.map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                    ))}
                </select>
            );
        }
        return (
            <input
                type="text"
                placeholder={field.placeholder || ""}
                value={value}
                onChange={(e) => updateInput(field.key, e.target.value)}
                className={cn(baseClass, "px-3 py-2")}
            />
        );
    };

    return (
        <div className="flex flex-col flex-1 min-h-0 gap-2 relative overflow-y-auto">
            <Card className="flex-none p-4">
                <div className="flex gap-6 items-start">
                    {/* Left: Employee Photo */}
                    <div className="w-48 h-48 shrink-0 rounded-3xl overflow-hidden bg-orange-50/50 border border-orange-100 flex items-center justify-center p-4 shadow-sm">
                        <img
                            src={employee.imageUrl}
                            alt={employee.title}
                            className="w-full h-full object-contain drop-shadow-sm"
                        />
                    </div>
                    {/* Right: Details & Skills */}
                    <div className="flex flex-col gap-4 flex-1">
                        {/* Header */}
                        <div className="flex justify-between items-start">
                            <h2 className="text-xl font-medium text-stone-800 tracking-tight">
                                Collaborating with {emp.codename} <span className="text-zinc-500 font-normal ml-2">({emp.title})</span>
                            </h2>
                            <div className="flex gap-2">
                                {showConversation && (
                                    <button
                                        onClick={handleStartNewChat}
                                        className="bg-zinc-200 hover:bg-zinc-300 text-zinc-700 px-3 py-2 rounded-lg text-xs font-medium transition-all"
                                    >
                                        New Chat
                                    </button>
                                )}
                            </div>
                        </div>
                        <p className="text-sm text-zinc-600 leading-relaxed max-w-2xl">{emp.description}</p>

                        {/* Skills — Radio Buttons */}
                        <div className="mt-1">
                            <div className="font-semibold text-sm mb-3 text-zinc-800">Select a Skill:</div>
                            <div className="space-y-1.5">
                                {skills.map((skill, idx) => (
                                    <label
                                        key={idx}
                                        className={cn(
                                            "flex items-center gap-3 px-3 py-2 rounded-lg border text-sm cursor-pointer transition-all",
                                            selectedSkillIdx === idx
                                                ? "border-blue-500 bg-blue-50 text-blue-700 shadow-sm"
                                                : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300 hover:bg-zinc-50"
                                        )}
                                    >
                                        <input
                                            type="radio"
                                            name="skill-select"
                                            className="w-4 h-4 text-blue-600 border-zinc-300 focus:ring-blue-500"
                                            checked={selectedSkillIdx === idx}
                                            onChange={() => handleSelectSkill(idx)}
                                        />
                                        <span className="font-medium">{skill.name}</span>
                                        {skill.inputFields && (
                                            <span className="text-[10px] text-zinc-400 ml-auto">{skill.inputFields.length} 個輸入欄位</span>
                                        )}
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* Prompt Detail — expandable */}
                        {promptTemplate && (
                            <div className="mt-2">
                                <button
                                    onClick={() => setShowPromptDetail(!showPromptDetail)}
                                    className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 font-medium transition"
                                >
                                    <svg className={cn("w-4 h-4 transition-transform", showPromptDetail ? "rotate-90" : "")} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                                    </svg>
                                    📋 Prompt Detail（System Prompt）
                                </button>
                                {showPromptDetail && (
                                    <pre className="mt-2 p-3 bg-zinc-950 text-zinc-100 rounded-xl text-xs whitespace-pre-wrap overflow-auto max-h-64 font-mono leading-relaxed">
                                        {promptTemplate}
                                    </pre>
                                )}
                            </div>
                        )}

                        {/* Dynamic Input Fields for selected skill */}
                        {selectedSkill && currentInputFields.length > 0 && !showConversation && (
                            <div className="mt-4 border border-zinc-200 rounded-xl p-4 bg-zinc-50/50">
                                <div className="font-semibold text-sm mb-3 text-zinc-800">
                                    💬 {selectedSkill.name}
                                </div>
                                <div className="space-y-3">
                                    {currentInputFields.map((field) => (
                                        <div key={field.key}>
                                            <label className="block text-xs font-medium text-zinc-600 mb-1">
                                                {field.label}
                                                {field.required && <span className="text-red-400 ml-1">*</span>}
                                            </label>
                                            {renderField(field)}
                                        </div>
                                    ))}
                                    <div>
                                        <label className="block text-xs font-medium text-zinc-600 mb-1">📝 補充說明（選填）</label>
                                        <textarea
                                            placeholder="其他想補充的..."
                                            value={initialPrompt}
                                            onChange={(e) => setInitialPrompt(e.target.value)}
                                            className="w-full h-16 bg-white border border-zinc-200 rounded-lg p-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-300 transition"
                                        />
                                    </div>
                                </div>
                                <button
                                    onClick={handleStartConversation}
                                    disabled={!hasRequiredFields()}
                                    className="mt-4 w-full bg-blue-500 hover:bg-blue-600 disabled:bg-zinc-300 text-white py-2.5 rounded-lg text-sm font-medium transition shadow-lg shadow-blue-200 disabled:shadow-none"
                                >
                                    🚀 開始對話
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </Card>

            {/* OpenCode Console */}
            {showConversation && (
                <Card className="shrink-0 h-[450px] flex flex-col overflow-hidden p-0 border-0 bg-transparent shadow-none">
                    <OpenCodeConsole
                        key={`console-${consoleKey}`}
                        selectedEmployee={emp}
                        className="flex-1 overflow-hidden m-0"
                        disableCard
                        initialMessage={buildPromptFromFields()}
                    />
                </Card>
            )}
        </div>
    );
}
