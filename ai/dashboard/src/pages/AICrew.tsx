import React, { useState, useEffect } from "react";
import { Card, RiskBadge, cn } from "../components/ui/shared";
import { loadCrew, clearCrewCache, CrewSkill } from "../data/crew";
import { Skill } from "../types";
import OpenCodeConsole from "./OpenCodeConsole";

interface AICrewProps {
    runSkill: (skill: Skill) => Promise<void>;
    openApp: (id: string) => void;
}

export default function AICrew({ runSkill, openApp }: AICrewProps) {
    const [skills, setSkills] = useState<CrewSkill[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadCrew().then((data) => {
            setSkills(data);
            setLoading(false);
        });
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full text-zinc-400 text-sm">
                Loading crew members...
            </div>
        );
    }

    return (
        <div className="flex flex-col space-y-4 h-full overflow-y-auto">
            <div className="flex items-center justify-between px-2">
                <h2 className="text-lg font-bold text-zinc-800">AI Crew Members</h2>
                <button
                    onClick={() => { clearCrewCache(); setLoading(true); loadCrew().then(d => { setSkills(d); setLoading(false); }); }}
                    className="text-xs text-blue-500 hover:text-blue-700 font-medium"
                >
                    🔄 Reload
                </button>
            </div>
            <Card className="border-0 shadow-none bg-transparent p-0">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-2 w-full">
                    {skills.map((s) => (
                        <button
                            key={s.id}
                            onClick={(e) => {
                                e.stopPropagation();
                                openApp(`employee.${s.id}`);
                            }}
                            className="flex flex-col rounded-2xl border bg-white p-0 overflow-hidden shadow-sm transition-all hover:shadow-md hover:-translate-y-1 group text-left border-orange-100 hover:border-orange-300"
                        >
                            <div className="h-32 w-full bg-orange-50/50 relative overflow-hidden shrink-0 flex items-center justify-center p-2">
                                {s.imageUrl ? (
                                    <img
                                        src={s.imageUrl}
                                        alt={s.title}
                                        className="w-full h-full object-contain transition-transform duration-500 group-hover:scale-110 drop-shadow-sm"
                                    />
                                ) : (
                                    <div className="text-4xl">🤖</div>
                                )}
                                <div className="absolute top-2 right-2 scale-75 origin-top-right">
                                    <RiskBadge risk={s.risk} />
                                </div>
                            </div>
                            <div className="p-4 flex flex-col flex-1 border-t border-orange-50">
                                <div className="text-base font-bold text-stone-800 truncate">{s.title}</div>
                                {(s as any).codename && (
                                    <div className="font-mono text-[10px] font-semibold text-orange-600 uppercase tracking-widest truncate mt-1">{(s as any).codename}</div>
                                )}
                                <div className="text-xs text-zinc-500 mt-2 line-clamp-2">{s.description}</div>
                            </div>
                        </button>
                    ))}
                </div>
            </Card>
        </div>
    );
}
