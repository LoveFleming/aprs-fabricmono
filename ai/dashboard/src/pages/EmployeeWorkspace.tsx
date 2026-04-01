import React, { useState, useEffect, useMemo } from "react";
import { Card, cn } from "../components/ui/shared";
import { SKILLS } from "../data/mockData";
import { Skill, CrewSkill, buildSystemPrompt } from "../types";
import OpenCodeConsole from "./OpenCodeConsole";

interface EmployeeWorkspaceProps {
    employeeId: string;
}

export default function EmployeeWorkspace({ employeeId }: EmployeeWorkspaceProps) {
    const employee = SKILLS.find((s) => s.id === employeeId);
    const [enabledSkills, setEnabledSkills] = useState<Record<string, boolean>>({});
    const [consoleKey, setConsoleKey] = useState(0);

    useEffect(() => {
        if (employee) {
            const initial: Record<string, boolean> = {};
            employee.skills.forEach(s => { initial[s.id] = s.enabled; });
            setEnabledSkills(initial);
            setConsoleKey(0);
        }
    }, [employee]);

    const selectedSkillIds = useMemo(() => {
        return Object.entries(enabledSkills)
            .filter(([_, v]) => v)
            .map(([k]) => k);
    }, [enabledSkills]);

    const systemPrompt = useMemo(() => {
        if (!employee) return "";
        return buildSystemPrompt(employee, selectedSkillIds);
    }, [employee, selectedSkillIds]);

    if (!employee) {
        return <div className="p-4 text-red-500">Employee not found.</div>;
    }

    const toggleSkill = (skillId: string) => {
        setEnabledSkills(prev => ({
            ...prev,
            [skillId]: !prev[skillId]
        }));
    };

    const handleStartNewChat = () => {
        setConsoleKey(prev => prev + 1);
    };

    return (
        <div className="flex flex-col flex-1 min-h-0 gap-2 relative">
            {/* Top panel: Employee header and skills */}
            <Card className="flex-1 overflow-y-auto min-h-0 p-4">
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
                        <div className="flex justify-between items-start">
                            <h2 className="text-xl font-medium text-stone-800 tracking-tight">
                                Collaborating with {employee.codename} <span className="text-zinc-500 font-normal ml-2">({employee.title})</span>
                            </h2>
                            <button
                                onClick={handleStartNewChat}
                                className="bg-zinc-800 hover:bg-zinc-900 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-sm transition-all focus:ring-2 focus:ring-offset-2 focus:ring-zinc-900 active:scale-95"
                            >
                                Start New Chat
                            </button>
                        </div>
                        <p className="text-sm text-zinc-600 leading-relaxed max-w-2xl">{employee.description}</p>
                        <div className="mt-1">
                            <div className="font-semibold text-sm mb-3 text-zinc-800">
                                Available Skills & Capabilities ({selectedSkillIds.length}/{employee.skills.length}):
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {employee.skills.map((skill: CrewSkill) => {
                                    const isSelected = enabledSkills[skill.id] ?? skill.enabled;
                                    return (
                                        <label
                                            key={skill.id}
                                            className={cn(
                                                "flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm cursor-pointer transition-all",
                                                isSelected
                                                    ? "border-blue-500 bg-blue-50 text-blue-700 shadow-sm"
                                                    : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300 hover:bg-zinc-50"
                                            )}
                                        >
                                            <input
                                                type="checkbox"
                                                className="w-4 h-4 text-blue-600 rounded border-zinc-300 focus:ring-blue-500"
                                                checked={isSelected}
                                                onChange={() => toggleSkill(skill.id)}
                                            />
                                            <div>
                                                <span className="font-medium">{skill.name}</span>
                                                <span className="text-xs text-zinc-400 ml-1.5">{skill.description}</span>
                                            </div>
                                        </label>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            </Card>

            {/* Prompt preview (collapsible) */}
            <details className="group">
                <summary className="text-xs text-zinc-400 cursor-pointer hover:text-zinc-600 px-2">
                    📝 System Prompt 預覽 ({systemPrompt.length} 字元, {selectedSkillIds.length} 技能)
                </summary>
                <pre className="bg-zinc-900 text-green-400 p-3 rounded-xl text-[11px] whitespace-pre-wrap font-mono max-h-[200px] overflow-y-auto mt-1">
                    {systemPrompt}
                </pre>
            </details>

            {/* Middle & Bottom panel: Large AI Console */}
            <Card className="shrink-0 h-[450px] flex flex-col overflow-hidden p-0 border-0 bg-transparent shadow-none">
                <OpenCodeConsole
                    key={`console-${consoleKey}`}
                    selectedEmployee={employee}
                    className="flex-1 overflow-hidden m-0"
                    disableCard
                />
            </Card>
        </div>
    );
}
