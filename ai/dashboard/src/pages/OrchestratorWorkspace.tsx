import React, { useMemo, useState, useEffect, useCallback } from "react";
import { ORCHESTRATORS } from "../data/mockOrchestrators";
import OverviewCard from "../components/orchestrator/OverviewCard";
import MarkdownSection from "../components/orchestrator/MarkdownSection";
import ApiSpecSection from "../components/orchestrator/ApiSpecSection";
import FlowStepList from "../components/orchestrator/FlowStepList";
import DecisionRuleTable from "../components/orchestrator/DecisionRuleTable";
import ObservabilityPanel from "../components/orchestrator/ObservabilityPanel";
import NodeContractPanel from "../components/orchestrator/NodeContractPanel";
import TestTargetsPanel from "../components/orchestrator/TestTargetsPanel";

export default function OrchestratorWorkspace({ 
    domain, 
    orchId 
}: { 
    domain: string; 
    orchId: string; 
}) {
    const [activeSection, setActiveSection] = useState("overview");

    const orch = useMemo(() => {
        return ORCHESTRATORS.find(o => o.domain === domain && o.id === orchId);
    }, [domain, orchId]);

    const sections = useMemo(() => {
        if (!orch) return [];
        return [
            { id: "overview", label: "Overview", component: <OverviewCard orch={orch} /> },
            { id: "story", label: "User Story", component: <MarkdownSection title="User Story" content={orch.userStoryMarkdown} /> },
            { id: "api", label: "API", component: <ApiSpecSection spec={orch.apiSpec} /> },
            { id: "spec", label: "Spec", component: <MarkdownSection title="Orchestrator Spec" content={orch.orchestratorSpecMarkdown} /> },
            { id: "flow", label: "Flow", component: <FlowStepList steps={orch.flowSteps} /> },
            { id: "rules", label: "Rules", component: <DecisionRuleTable rules={orch.decisionRules} /> },
            { id: "obs", label: "Observability", component: <ObservabilityPanel errorPolicy={orch.errorPolicy} errorCodes={orch.errorCodes} observability={orch.observability} /> },
            { id: "nodes", label: "Nodes", component: <NodeContractPanel contracts={orch.nodeContracts} /> },
            { id: "runbook", label: "Runbook", component: <MarkdownSection title="Runbook" content={orch.runbookMarkdown} /> },
            { id: "tests", label: "Tests", component: <TestTargetsPanel targets={orch.testTargets} /> },
        ];
    }, [orch]);

    const scrollTo = useCallback((id: string) => {
        const el = document.getElementById(`section-${id}`);
        if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'start' });
            setActiveSection(id);
        }
    }, []);

    // Track active section on scroll
    useEffect(() => {
        const container = document.getElementById('orch-scroll-container');
        if (!container) return;
        const handleScroll = () => {
            const sectionEls = sections.map(s => ({
                id: s.id,
                el: document.getElementById(`section-${s.id}`)
            })).filter(s => s.el);
            for (let i = sectionEls.length - 1; i >= 0; i--) {
                const rect = sectionEls[i].el!.getBoundingClientRect();
                if (rect.top <= 120) {
                    setActiveSection(sectionEls[i].id);
                    return;
                }
            }
        };
        container.addEventListener('scroll', handleScroll);
        return () => container.removeEventListener('scroll', handleScroll);
    }, [sections]);

    if (!orch) return <div className="p-8 text-center text-zinc-500">Orchestrator not found.</div>;

    return (
        <div className="flex h-full gap-4 animate-in fade-in duration-300 overflow-hidden">
            {/* Left Navigation */}
            <div className="w-36 shrink-0 overflow-y-auto py-1">
                <div className="space-y-0.5 bg-zinc-100 rounded-lg p-2 border border-zinc-200">
                    <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-2 px-2 border-b border-zinc-200 pb-1.5">
                        Navigation
                    </div>
                    {sections.map(sec => sec.component && (
                        <button
                            key={sec.id}
                            onClick={() => scrollTo(sec.id)}
                            className={`w-full text-left px-2 py-1.5 text-xs font-medium rounded transition-colors truncate ${
                                activeSection === sec.id
                                    ? 'text-blue-600 bg-white shadow-sm'
                                    : 'text-zinc-600 hover:text-blue-600 hover:bg-white/50'
                            }`}
                        >
                            {sec.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Main Content Scrollable Area */}
            <div className="flex-1 overflow-y-auto pr-4 pb-12" id="orch-scroll-container">
                <div className="space-y-6 max-w-[1000px]">
                    {sections.map(sec => sec.component ? (
                        <div key={sec.id} id={`section-${sec.id}`} className="scroll-mt-4">
                            {sec.component}
                        </div>
                    ) : null)}
                </div>
            </div>
        </div>
    );
}
