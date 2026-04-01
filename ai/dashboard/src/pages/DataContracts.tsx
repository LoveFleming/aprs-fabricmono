import React from "react";
import { Card } from "../components/ui/shared";
import { cn } from "../utils";

// Load specs
import lotToolMaterialCheckSpec from "../../public/specs-old/api-contracts/api-lot-tool-material-check.json";
import lotToolChamberMaterialCheckSpec from "../../public/specs-old/api-contracts/api-lot-tool-chamber-material-check.json";

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
                                <th className="px-6 py-4 font-semibold text-zinc-900">API Name</th>
                                <th className="px-6 py-4 font-semibold text-zinc-900">Endpoint</th>
                                <th className="px-6 py-4 font-semibold text-zinc-900">Version</th>
                                <th className="px-6 py-4 font-semibold text-zinc-900">Status</th>
                                <th className="px-6 py-4 w-1 flex justify-end"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100">
                            {specs.map((specData, idx) => {
                                const { apiContract, endpoint } = specData;
                                return (
                                    <tr 
                                        key={idx} 
                                        className="transition-colors hover:bg-zinc-50 cursor-pointer group"
                                        onClick={() => openApp?.(`api.${apiContract.name}`)}
                                    >
                                        <td className="px-6 py-4">
                                            <div className="font-semibold text-blue-700 group-hover:text-blue-800 transition-colors">
                                                {apiContract.name}
                                            </div>
                                            <div className="text-xs text-zinc-500 mt-1 truncate max-w-xs xl:max-w-md">
                                                {apiContract.summary}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="font-mono text-xs text-zinc-800 flex items-center gap-2">
                                                <span className={cn("px-2 py-0.5 rounded font-bold text-white text-[10px]", 
                                                    endpoint.method === "POST" ? "bg-blue-500" : "bg-zinc-500"
                                                )}>
                                                    {endpoint.method}
                                                </span> 
                                                {endpoint.path}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-zinc-600 font-mono text-xs">
                                            v{apiContract.version}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className={cn("inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase",
                                                apiContract.status === "active" ? "bg-green-100 text-green-700" :
                                                apiContract.status === "draft" ? "bg-amber-100 text-amber-700" :
                                                apiContract.status === "deprecated" ? "bg-red-100 text-red-700" : "bg-zinc-100 text-zinc-700"
                                            )}>
                                                {apiContract.status}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <span className="text-zinc-400 group-hover:text-blue-600">
                                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 inline">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                                                </svg>
                                            </span>
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
