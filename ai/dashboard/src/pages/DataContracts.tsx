import React from "react";
import { Card } from "../components/ui/shared";
import { cn } from "../utils";

// Load specs
import lotToolMaterialCheckSpec from "../../../../specs/api-contracts/api-lot-tool-material-check.json";
import lotToolChamberMaterialCheckSpec from "../../../../specs/api-contracts/api-lot-tool-chamber-material-check.json";

const specs = [
    lotToolMaterialCheckSpec,
    lotToolChamberMaterialCheckSpec
];

export default function DataContracts({ openApp }: { openApp?: (id: string) => void }) {
    return (
        <div className="space-y-6">
            <Card title="API Data Contracts Registry">
                <div className="rounded-2xl border border-zinc-200 bg-white overflow-hidden">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead className="bg-zinc-50 border-b border-zinc-200">
                            <tr>
                                <th className="px-6 py-4 font-semibold text-zinc-900">API</th>
                                <th className="px-6 py-4 font-semibold text-zinc-900">Endpoint</th>
                                <th className="px-6 py-4 font-semibold text-zinc-900">Method</th>
                                <th className="px-6 py-4 font-semibold text-zinc-900">Description</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100">
                            {specs.map((specData: any, idx: number) => {
                                const api = specData.apiContract;
                                return (
                                    <tr key={idx} className="transition-colors hover:bg-zinc-50">
                                        <td className="px-6 py-4">
                                            <div className="font-semibold text-blue-700">
                                                API Contract {idx + 1}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="font-mono text-xs text-zinc-800">
                                                {api.endpoint}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={cn("px-2 py-0.5 rounded font-bold text-white text-[10px]",
                                                api.method === "POST" ? "bg-blue-500" : "bg-zinc-500"
                                            )}>
                                                {api.method}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-zinc-600 text-xs">
                                            {api.description}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
}
