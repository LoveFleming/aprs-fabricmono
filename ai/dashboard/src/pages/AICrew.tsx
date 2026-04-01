import React, { useState, useMemo } from "react";
import { Card, RiskBadge, cn } from "../components/ui/shared";
import { SKILLS } from "../data/mockData";
import { Skill, CrewSkill, buildSystemPrompt } from "../types";

interface AICrewProps {
    runSkill: (skill: Skill) => Promise<void>;
    openApp: (id: string) => void;
}

function SkillCheckbox({ skill, checked, onChange }: {
    skill: CrewSkill;
    checked: boolean;
    onChange: (id: string, enabled: boolean) => void;
}) {
    return (
        <label className="flex items-start gap-2 py-1.5 px-2 rounded-lg hover:bg-zinc-50 cursor-pointer group">
            <input
                type="checkbox"
                checked={checked}
                onChange={(e) => onChange(skill.id, e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-zinc-300 text-orange-500 focus:ring-orange-400 accent-orange-500"
            />
            <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-zinc-800 group-hover:text-orange-700 flex items-center gap-2">
                    {skill.name}
                    {skill.enabled && (
                        <span className="text-[10px] bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded-full">預設</span>
                    )}
                </div>
                <div className="text-xs text-zinc-500 mt-0.5">{skill.description}</div>
            </div>
        </label>
    );
}

export default function AICrew({ runSkill, openApp }: AICrewProps) {
    const [selectedCrew, setSelectedCrew] = useState<Skill | null>(null);
    const [enabledSkills, setEnabledSkills] = useState<Record<string, boolean>>({});
    const [showPreview, setShowPreview] = useState(false);

    const handleSelectCrew = (crew: Skill) => {
        setSelectedCrew(crew);
        // Initialize from crew's skill defaults
        const initial: Record<string, boolean> = {};
        crew.skills.forEach(s => { initial[s.id] = s.enabled; });
        setEnabledSkills(initial);
        setShowPreview(false);
    };

    const handleSkillToggle = (skillId: string, enabled: boolean) => {
        setEnabledSkills(prev => ({ ...prev, [skillId]: enabled }));
    };

    const selectedSkillIds = useMemo(() => {
        if (!selectedCrew) return [];
        return Object.entries(enabledSkills)
            .filter(([_, v]) => v)
            .map(([k]) => k);
    }, [selectedCrew, enabledSkills]);

    const systemPrompt = useMemo(() => {
        if (!selectedCrew) return "";
        return buildSystemPrompt(selectedCrew, selectedSkillIds);
    }, [selectedCrew, selectedSkillIds]);

    if (selectedCrew) {
        return (
            <div className="flex flex-col space-y-4 h-full">
                {/* Back button */}
                <button
                    onClick={() => { setSelectedCrew(null); setShowPreview(false); }}
                    className="self-start flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-800 transition-colors"
                >
                    <span className="text-lg">←</span> 返回 Crew 列表
                </button>

                <div className="flex flex-col lg:flex-row gap-6">
                    {/* Left: Crew info + Skill selection */}
                    <div className="flex-1 space-y-4">
                        {/* Crew card */}
                        <Card title="">
                            <div className="flex items-start gap-4">
                                <img
                                    src={selectedCrew.imageUrl}
                                    alt={selectedCrew.title}
                                    className="w-20 h-20 object-contain rounded-xl"
                                />
                                <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                        <h2 className="text-lg font-bold text-zinc-800">{selectedCrew.title}</h2>
                                        <RiskBadge risk={selectedCrew.risk} />
                                    </div>
                                    <div className="font-mono text-xs text-orange-600 tracking-widest mt-0.5">{selectedCrew.codename}</div>
                                    <p className="text-sm text-zinc-500 mt-1">{selectedCrew.description}</p>
                                </div>
                            </div>
                        </Card>

                        {/* Skill selection */}
                        <Card title={`技能清單 (${selectedSkillIds.length}/${selectedCrew.skills.length})`}>
                            <p className="text-xs text-zinc-400 mb-3">勾選要載入的技能，開始對話時會自動組合成提示詞</p>
                            <div className="space-y-1">
                                {selectedCrew.skills.map(skill => (
                                    <SkillCheckbox
                                        key={skill.id}
                                        skill={skill}
                                        checked={enabledSkills[skill.id] ?? skill.enabled}
                                        onChange={handleSkillToggle}
                                    />
                                ))}
                            </div>
                        </Card>

                        {/* Action buttons */}
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowPreview(!showPreview)}
                                className="flex-1 py-2.5 px-4 rounded-xl border border-zinc-200 text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition-colors"
                            >
                                {showPreview ? '隱藏提示詞預覽' : '🔍 預覽提示詞'}
                            </button>
                            <button
                                onClick={() => {
                                    // TODO: start chat with selectedCrew + selectedSkillIds
                                    console.log("Start chat:", selectedCrew.id, selectedSkillIds);
                                    console.log("System prompt:", systemPrompt);
                                    alert(`開始對話！\n\nCrew: ${selectedCrew.codename}\nSkills: ${selectedSkillIds.length} 個\nPrompt 長度: ${systemPrompt.length} 字`);
                                }}
                                className={cn(
                                    "flex-1 py-2.5 px-4 rounded-xl text-sm font-bold transition-all",
                                    selectedSkillIds.length > 0
                                        ? "bg-orange-500 text-white hover:bg-orange-600 shadow-sm"
                                        : "bg-zinc-100 text-zinc-400 cursor-not-allowed"
                                )}
                                disabled={selectedSkillIds.length === 0}
                            >
                                💬 開始對話
                            </button>
                        </div>
                    </div>

                    {/* Right: Prompt preview */}
                    {showPreview && (
                        <div className="lg:w-1/2">
                            <Card title="📝 System Prompt 預覽">
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between text-xs text-zinc-400">
                                        <span>已選 {selectedSkillIds.length} 個技能</span>
                                        <span>{systemPrompt.length} 字元</span>
                                    </div>
                                    <pre className="bg-zinc-900 text-green-400 p-4 rounded-xl text-xs whitespace-pre-wrap font-mono max-h-[500px] overflow-y-auto">
                                        {systemPrompt}
                                    </pre>
                                    <div className="flex flex-wrap gap-2">
                                        {selectedCrew.skills
                                            .filter(s => enabledSkills[s.id])
                                            .map(s => (
                                                <span key={s.id} className="text-[10px] bg-orange-100 text-orange-700 px-2 py-1 rounded-full">
                                                    ✅ {s.name}
                                                </span>
                                            ))
                                        }
                                    </div>
                                </div>
                            </Card>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // Grid view: crew cards
    return (
        <div className="flex flex-col space-y-4 h-full">
            <Card title="AI Crew Members" className="border-0 shadow-none bg-transparent p-0">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-2 w-full">
                    {SKILLS.map((s) => (
                        <button
                            key={s.id}
                            onClick={() => handleSelectCrew(s)}
                            className={cn(
                                "flex flex-col rounded-2xl border bg-white p-0 overflow-hidden shadow-sm transition-all hover:shadow-md hover:-translate-y-1 group text-left",
                                "border-orange-100 hover:border-orange-300"
                            )}
                        >
                            <div className="h-32 w-full bg-orange-50/50 relative overflow-hidden shrink-0 flex items-center justify-center p-2">
                                <img
                                    src={s.imageUrl}
                                    alt={s.title}
                                    className="w-full h-full object-contain transition-transform duration-500 group-hover:scale-110 drop-shadow-sm"
                                />
                                <div className="absolute top-2 right-2 scale-75 origin-top-right">
                                    <RiskBadge risk={s.risk} />
                                </div>
                            </div>
                            <div className="p-4 flex flex-col flex-1 border-t border-orange-50">
                                <div className="text-base font-bold text-stone-800 truncate">{s.title}</div>
                                <div className="font-mono text-[10px] font-semibold text-orange-600 uppercase tracking-widest truncate mt-1">{s.codename}</div>
                                <div className="text-xs text-zinc-500 mt-2 line-clamp-2">{s.description}</div>
                                <div className="flex flex-wrap gap-1 mt-3">
                                    {s.skills.slice(0, 3).map(sk => (
                                        <span key={sk.id} className="text-[10px] bg-zinc-100 text-zinc-600 px-1.5 py-0.5 rounded-full">
                                            {sk.name}
                                        </span>
                                    ))}
                                    {s.skills.length > 3 && (
                                        <span className="text-[10px] bg-zinc-100 text-zinc-400 px-1.5 py-0.5 rounded-full">
                                            +{s.skills.length - 3}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </button>
                    ))}
                </div>
            </Card>
        </div>
    );
}
