import React, { useState, useEffect } from "react";
import { Card } from "../components/ui/shared";

interface SpecEntry {
  type: string;
  path: string;
  fileName: string;
  format: string;
  name: string;
  data?: any;
  preview?: string;
}

export default function DataContracts({ openApp }: { openApp?: (id: string) => void }) {
    const [specs, setSpecs] = useState<SpecEntry[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch("/data/specs-index.json")
            .then(r => r.json())
            .then((data: SpecEntry[]) => {
                setSpecs(data);
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, []);

    if (loading) {
        return <div className="flex items-center justify-center h-64 text-zinc-400 text-sm">Loading contracts...</div>;
    }

    // Group by type
    const grouped = specs.reduce<Record<string, SpecEntry[]>>((acc, s) => {
        if (!acc[s.type]) acc[s.type] = [];
        acc[s.type].push(s);
        return acc;
    }, {} as Record<string, SpecEntry[]>);

    return (
        <div className="space-y-6 h-full overflow-y-auto">
            {Object.entries(grouped).map(([type, entries]) => (
                <Card key={type} title={type.replace(/-contracts/, " Contracts").toUpperCase()}>
                    <div className="rounded-2xl border border-zinc-200 bg-white overflow-hidden">
                        <table className="w-full text-left text-sm whitespace-nowrap">
                            <thead className="bg-zinc-50 border-b border-zinc-200">
                                <tr>
                                    <th className="px-6 py-4 font-semibold text-zinc-900">Contract</th>
                                    <th className="px-6 py-4 font-semibold text-zinc-900">File</th>
                                    <th className="px-6 py-4 font-semibold text-zinc-900">Format</th>
                                    <th className="px-6 py-4 font-semibold text-zinc-900">Details</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-100">
                                {entries.map((entry) => {
                                    const api = entry.data?.apiContract;
                                    return (
                                        <tr key={entry.path} className="transition-colors hover:bg-zinc-50">
                                            <td className="px-6 py-4">
                                                <div className="font-semibold text-blue-700">{entry.name}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="font-mono text-xs text-zinc-800">{entry.fileName}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="px-2 py-0.5 rounded font-bold text-[10px] text-white bg-blue-500">
                                                    {entry.format}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-zinc-600 text-xs">
                                                {api ? `${api.method} ${api.endpoint}` : entry.preview ? entry.preview.slice(0, 80) + "..." : "—"}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </Card>
            ))}
        </div>
    );
}
