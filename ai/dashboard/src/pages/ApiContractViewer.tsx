import React, { useState, useEffect } from "react";
import { Card } from "../components/ui/shared";
import { cn } from "../utils";

interface SpecEntry {
  type: string;
  path: string;
  fileName: string;
  format: string;
  name: string;
  data?: any;
  preview?: string;
}

export default function ApiContractViewer({ apiName }: { apiName: string }) {
    const [specData, setSpecData] = useState<SpecEntry | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch("/data/specs-index.json")
            .then(r => r.json())
            .then((specs: SpecEntry[]) => {
                const found = specs.find(s => s.name === apiName && s.format === "json");
                setSpecData(found || null);
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, [apiName]);

    if (loading) {
        return <div className="flex items-center justify-center h-64 text-zinc-400 text-sm">Loading contract...</div>;
    }

    if (!specData || !specData.data) {
        return (
            <div className="space-y-6">
                <Card title="API Data Contract">
                    <div className="p-6 text-red-500">Contract not found: {apiName}</div>
                </Card>
            </div>
        );
    }

    const { data } = specData;
    const apiContract = data.apiContract;

    return (
        <div className="space-y-6">
            <Card title={`API Contract: ${specData.name}`}>
                <div className="rounded-2xl border border-zinc-200 bg-white p-6">
                    <div className="flex items-start justify-between gap-3 border-b border-zinc-100 pb-4">
                        <div>
                            <div className="text-xl font-bold text-zinc-900">{apiContract?.name || specData.name}</div>
                            <div className="mt-1 text-sm text-zinc-500">{apiContract?.description || specData.path}</div>
                        </div>
                        <div className="rounded-full px-3 py-1 text-xs font-semibold uppercase bg-blue-100 text-blue-700">
                            {apiContract?.method || "N/A"}
                        </div>
                    </div>

                    <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
                            <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Endpoint</div>
                            <div className="font-mono text-sm text-zinc-800 flex items-center gap-2">
                                <span className={cn(
                                    "px-2 py-0.5 rounded text-xs font-bold text-white",
                                    apiContract?.method === "POST" ? "bg-blue-500" : "bg-zinc-500"
                                )}>
                                    {apiContract?.method || "N/A"}
                                </span>
                                {apiContract?.endpoint || "N/A"}
                            </div>
                        </div>

                        <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
                            <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Source</div>
                            <div className="text-sm text-zinc-800 font-mono">{specData.path}</div>
                        </div>
                    </div>

                    {/* Show full JSON */}
                    <div className="mt-6">
                        <div className="text-sm font-semibold text-zinc-900 mb-2">Full Contract (JSON)</div>
                        <div className="rounded-xl border border-zinc-200 bg-zinc-900 p-4 font-mono text-xs text-zinc-300 overflow-x-auto">
                            <pre>{JSON.stringify(data, null, 2)}</pre>
                        </div>
                    </div>
                </div>
            </Card>
        </div>
    );
}
