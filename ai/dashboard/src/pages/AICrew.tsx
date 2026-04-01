import React from "react";
import { Card, RiskBadge, cn } from "../components/ui/shared";
import { SKILLS } from "../data/mockData";
import { Skill } from "../types";

interface AICrewProps {
    runSkill: (skill: Skill) => Promise<void>;
    openApp: (id: string) => void;
}

export default function AICrew({ openApp }: AICrewProps) {
    return (
        <div className="flex flex-col space-y-4 h-full">
            <Card title="AI Crew Members" className="border-0 shadow-none bg-transparent p-0">
                <p className="text-xs text-zinc-400 mb-4 px-2">點選 Crew 開啟工作區，可以同時開多個員工的 tab</p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-2 w-full">
                    {SKILLS.map((s) => (
                        <button
                            key={s.id}
                            onClick={() => openApp(`employee.${s.id}`)}
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
                                        <span key={sk.id} className={cn(
                                            "text-[10px] px-1.5 py-0.5 rounded-full",
                                            sk.enabled
                                                ? "bg-orange-100 text-orange-700"
                                                : "bg-zinc-100 text-zinc-400"
                                        )}>
                                            {sk.enabled ? '✓' : '○'} {sk.name}
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
