import React from "react";
import { Card } from "../components/ui/shared";
import { cn } from "../utils";
import lotToolMaterialCheckSpec from "../../../../specs/api-contracts/api-lot-tool-material-check.json";
import lotToolChamberMaterialCheckSpec from "../../../../specs/api-contracts/api-lot-tool-chamber-material-check.json";

// We load all specs in a map for dynamic rendering
const specMap: Record<string, any> = {
    "api-lot-tool-material-check": lotToolMaterialCheckSpec,
    "api-lot-tool-chamber-material-check": lotToolChamberMaterialCheckSpec
};

export default function ApiContractViewer({ apiName }: { apiName: string }) {
    const specData = specMap[apiName];

    if (!specData) {
        return (
            <div className="space-y-6">
                <Card title="API Data Contract">
                    <div className="p-6 text-red-500">Spec not found for: {apiName}</div>
                </Card>
            </div>
        );
    }

    const { apiContract, endpoint, authentication, request, response } = specData;

    return (
        <div className="space-y-6">
            <Card title={`API Contract: ${apiContract.name}`}>
                <div className="rounded-2xl border border-zinc-200 bg-white p-6">
                    <div className="flex items-start justify-between gap-3 border-b border-zinc-100 pb-4">
                        <div>
                            <div className="text-xl font-bold text-zinc-900">{apiContract.name}</div>
                            <div className="mt-1 text-sm text-zinc-500">
                                {apiContract.summary}
                            </div>
                        </div>
                        <div className={cn("rounded-full px-3 py-1 text-xs font-semibold uppercase",
                            apiContract.status === "active" ? "bg-green-100 text-green-700" :
                            apiContract.status === "draft" ? "bg-amber-100 text-amber-700" :
                            apiContract.status === "deprecated" ? "bg-red-100 text-red-700" : "bg-zinc-100 text-zinc-700"
                        )}>
                            {apiContract.status} v{apiContract.version}
                        </div>
                    </div>

                    <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
                            <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Endpoint</div>
                            <div className="font-mono text-sm text-zinc-800 flex items-center gap-2">
                                <span className={cn("px-2 py-0.5 rounded text-xs font-bold text-white", endpoint.method === "POST" ? "bg-blue-500" : "bg-zinc-500")}>
                                    {endpoint.method}
                                </span> 
                                {endpoint.path}
                            </div>
                        </div>

                        <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
                            <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Authentication</div>
                            <div className="text-sm text-zinc-800">
                                {authentication.required ? "Required" : "Optional"} - Type: <span className="font-mono">{authentication.type}</span>
                            </div>
                        </div>
                    </div>

                    <div className="mt-6">
                        <div className="text-sm font-semibold text-zinc-900 mb-2">Request Body Schema</div>
                        <div className="rounded-xl border border-zinc-200 bg-zinc-900 p-4 font-mono text-xs text-zinc-300 overflow-x-auto">
                            <pre>{JSON.stringify(request.bodySchema, null, 2)}</pre>
                        </div>
                    </div>

                    <div className="mt-6">
                        <div className="text-sm font-semibold text-zinc-900 mb-2">Response (Success - {response.success.httpStatus})</div>
                        <div className="rounded-xl border border-zinc-200 bg-zinc-900 p-4 font-mono text-xs text-zinc-300 overflow-x-auto">
                            <pre>{JSON.stringify(response.success.bodySchema, null, 2)}</pre>
                        </div>
                    </div>

                    <div className="mt-6">
                        <div className="text-sm font-semibold text-zinc-900 mb-2">Possible Errors</div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            {response.errors.map((err: any, idx: number) => (
                                <div key={idx} className="rounded-xl border border-red-200 bg-red-50 p-3">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="font-bold text-red-700">{err.httpStatus}</span>
                                        <span className="text-xs font-semibold uppercase text-red-500">{err.errorBody.errorType}</span>
                                    </div>
                                    <div className="text-xs font-mono text-red-800">{err.errorBody.errorCode}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </Card>
        </div>
    );
}
