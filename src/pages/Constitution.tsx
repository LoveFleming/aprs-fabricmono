import React, { useState } from "react";
import { Card } from "../components/ui/shared";

const sections = [
  {
    icon: "🌟",
    title: "AI Factory Manifesto",
    id: "manifesto",
    content: [
      "- Spec is Single Source of Truth",
      "- Spec drives runtime, testing, observability, and runbook",
      "- AI generates, human reviews",
      "- Fail fast over debug later",
      "- Everything must be observable, traceable, and recoverable",
    ],
  },
  {
    icon: "📜",
    title: "Core Principles",
    id: "principles",
    items: [
      { num: 1, title: "Predictable Delivery", desc: "All delivery is governed by spec + deterministic gates" },
      { num: 2, title: "No Spec = No Code", desc: "No implementation without contract" },
      { num: 3, title: "Observability First", desc: "Every flow must be traceable" },
      { num: 4, title: "Runbook First", desc: "Every error must be actionable" },
      { num: 5, title: "Built-in Reliability", desc: "Retry, idempotency, fallback are first-class" },
      { num: 6, title: "Closed Loop Engineering", desc: "Incident → Runbook → Spec → Improvement" },
    ],
  },
  {
    icon: "🏗️",
    title: "Architecture Layering Rules",
    id: "layering",
    layers: [
      { name: "Controller", role: "API boundary, validation/auth, response mapping" },
      { name: "Service", role: "Use-case entry, orchestrator invocation" },
      { name: "Orchestrator", role: "Flow control, branch/retry/fallback/compensation" },
      { name: "Node", role: "Business semantic unit, input/output contract, throw accurate errors" },
      { name: "Utility", role: "Reusable technical helpers, no business logic" },
    ],
    forbidden: [
      "Controller contains business logic",
      "Service becomes orchestrator",
      "Orchestrator contains detailed business logic",
      "Node performs flow control",
      "Utility contains business semantics",
    ],
    rule: "Reverse dependency is forbidden.",
  },
  {
    icon: "📐",
    title: "Spec-Driven Rules",
    id: "spec",
    mustDefine: ["Input / Output schema", "Error behavior", "Flow decision", "Observability fields"],
    mustBe: ["Validatable (fail fast at startup)", "Executable (drive runtime behavior)"],
    drives: ["code", "test", "runbook", "metrics"],
  },
  {
    icon: "🧱",
    title: "Node Design Rules",
    id: "node",
    definition: "Node = Business Semantic Unit",
    must: ["Have clear input/output schema", "Be named with business meaning", "Be small and understandable"],
    can: ["Throw Biz Error"],
    mustNot: ["Control flow", "Access global state directly"],
    priority: "Use framework utility first",
  },
  {
    icon: "🔄",
    title: "Orchestrator Rules",
    id: "orchestrator",
    definition: "Orchestrator = Flow Engine",
    responsibilities: ["Flow control", "Branch decision", "Retry / fallback / compensation", "Context state management"],
    must: ["Keep flow readable", "Use node result for decision"],
    mustNot: ["Implement detailed business logic"],
    decisionTypes: ["success", "fail", "error"],
  },
  {
    icon: "🚨",
    title: "Error Code Rules",
    id: "errors",
    pattern: "{CODE_CLASS}_{AREA}_{FAMILY}_{DETAIL}",
    codeClass: ["SYS", "BIZ", "EXT"],
    area: ["CTRL", "ORCH", "NODE", "FW"],
    errorTypes: ["VALIDATION", "BIZ", "DEPENDENCY", "TIMEOUT", "SYSTEM"],
    rules: [
      "Node throws the most accurate error",
      "Upper layer must not rewrite error",
      "ErrorCode must be stable and aggregatable",
    ],
  },
  {
    icon: "📊",
    title: "Observability Rules",
    id: "observability",
    fields: ["traceId", "orchestrator", "node", "action", "status"],
    metric: "giga_api_outcomes_total",
    outcomes: ["success", "fail", "error"],
    reasonField: "errorCode or NA",
  },
  {
    icon: "🧪",
    title: "Testing Rules",
    id: "testing",
    node: ["Must have unit test", "Coverage = 100%"],
    api: ["Must have E2E test"],
    rules: ["AI generates tests", "Human reviews tests"],
  },
  {
    icon: "🚀",
    title: "Release & Fail-Fast Rules",
    id: "release",
    caughtAt: ["startup", "pre-prod", "canary"],
    mustSupport: ["blue/green deployment", "canary release", "auto rollback"],
    principle: "Fail First, never fail in full production",
  },
  {
    icon: "🤖",
    title: "AI Employee Rules",
    id: "ai-employee",
    must: ["Follow spec strictly", "Pass deterministic gates", "Use predefined rules and patterns"],
    mustNot: ["Invent naming", "Skip validation"],
    mustUse: ["prompt templates", "memory bank"],
  },
  {
    icon: "🔐",
    title: "Coding Guardrails",
    id: "guardrails",
    forbidden: ["No schema DTO", "No error code", "No test"],
    required: ["Use framework utilities", "Follow naming rules", "Follow layering rules"],
  },
  {
    icon: "🧠",
    title: "Prompt & Memory Rules",
    id: "prompt-memory",
    allAiTasksMust: ["Use prompt template", "Include spec", "Include rules", "Include example"],
    memoryBankMustStore: ["naming conventions", "error patterns", "architecture rules"],
  },
];

export default function Constitution() {
  const [activeSection, setActiveSection] = useState<string | null>(null);

  return (
    <div className="flex gap-6 h-full">
      {/* Sidebar TOC */}
      <aside className="w-56 shrink-0 bg-white border-r border-zinc-200 overflow-y-auto py-4 px-3">
        <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3 px-2">🏛️ Constitution v1</h2>
        <div className="space-y-0.5">
          {sections.map((s) => (
            <button
              key={s.id}
              onClick={() => setActiveSection(activeSection === s.id ? null : s.id)}
              className={`w-full text-left px-2 py-1.5 rounded-md text-xs transition-colors ${
                activeSection === s.id
                  ? "bg-blue-50 text-blue-700 font-medium"
                  : "text-zinc-600 hover:bg-zinc-50"
              }`}
            >
              {s.icon} {s.title}
            </button>
          ))}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto py-6 px-4 space-y-6">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black text-zinc-900 tracking-tight mb-2">🏛️ AI Factory Constitution v1</h1>
          <p className="text-zinc-500 text-sm">The foundational rules and principles governing the AI Software Factory</p>
        </div>

        {sections
          .filter((s) => !activeSection || s.id === activeSection)
          .map((s) => (
            <Card key={s.id} className="p-5 border-zinc-200">
              <h2 className="text-lg font-bold text-zinc-900 mb-3 flex items-center gap-2">
                <span className="text-xl">{s.icon}</span> {s.title}
              </h2>

              {/* Manifesto */}
              {"content" in s && s.content && (
                <ul className="space-y-1.5">
                  {s.content.map((line, i) => (
                    <li key={i} className="text-sm text-zinc-700 flex items-start gap-2">
                      <span className="text-blue-500 mt-0.5">▸</span> {line.replace(/^- /, "")}
                    </li>
                  ))}
                </ul>
              )}

              {/* Core Principles */}
              {"items" in s && s.items && (
                <div className="grid gap-3">
                  {(s.items as any[]).map((item: any) => (
                    <div key={item.num} className="flex gap-3 items-start">
                      <span className="shrink-0 w-7 h-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold">{item.num}</span>
                      <div>
                        <span className="font-semibold text-zinc-900 text-sm">{item.title}</span>
                        <p className="text-xs text-zinc-500 mt-0.5">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Layering */}
              {"layers" in s && s.layers && (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-xs font-bold text-zinc-500 uppercase mb-2">Layering</h3>
                    <div className="flex items-center gap-2 text-xs">
                      {(s.layers as any[]).map((l: any, i: number) => (
                        <React.Fragment key={l.name}>
                          <span className="px-2.5 py-1.5 rounded-md bg-blue-50 text-blue-700 font-semibold border border-blue-200">{l.name}</span>
                          {i < (s.layers as any[]).length - 1 && <span className="text-zinc-400">→</span>}
                        </React.Fragment>
                      ))}
                    </div>
                    <div className="mt-2 space-y-1">
                      {(s.layers as any[]).map((l: any) => (
                        <div key={l.name} className="text-xs text-zinc-600 flex gap-2">
                          <span className="font-semibold text-zinc-800 w-24 shrink-0">{l.name}:</span> {l.role}
                        </div>
                      ))}
                    </div>
                  </div>
                  {"forbidden" in s && (s.forbidden as string[]).length > 0 && (
                    <div>
                      <h3 className="text-xs font-bold text-red-500 uppercase mb-1">🚫 Forbidden</h3>
                      <ul className="space-y-0.5">
                        {(s.forbidden as string[]).map((f, i) => (
                          <li key={i} className="text-xs text-red-600 flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" /> {f}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {"rule" in s && (
                    <div className="bg-amber-50 border border-amber-200 rounded-md px-3 py-2 text-xs text-amber-800 font-medium">
                      ⚖️ Rule: {s.rule as string}
                    </div>
                  )}
                </div>
              )}

              {/* Spec-Driven */}
              {"mustDefine" in s && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-xs font-bold text-zinc-500 uppercase mb-1">Must Define</h3>
                    <ul className="space-y-0.5">
                      {(s.mustDefine as string[]).map((d, i) => (
                        <li key={i} className="text-xs text-zinc-700 flex items-center gap-1.5"><span className="text-green-500">✓</span> {d}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-zinc-500 uppercase mb-1">Must Be</h3>
                    <ul className="space-y-0.5">
                      {(s.mustBe as string[]).map((b, i) => (
                        <li key={i} className="text-xs text-zinc-700 flex items-center gap-1.5"><span className="text-green-500">✓</span> {b}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="col-span-2">
                    <h3 className="text-xs font-bold text-zinc-500 uppercase mb-1">Drives</h3>
                    <div className="flex gap-2">
                      {(s.drives as string[]).map((d, i) => (
                        <span key={i} className="px-2 py-1 rounded bg-indigo-50 text-indigo-700 text-xs font-medium">{d}</span>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Node / Orchestrator */}
              {"definition" in s && (
                <div className="space-y-3">
                  <div className="bg-blue-50 border border-blue-200 rounded-md px-3 py-2 text-sm font-semibold text-blue-800">{s.definition as string}</div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <h3 className="text-xs font-bold text-green-600 uppercase mb-1">✅ Must</h3>
                      <ul className="space-y-0.5">
                        {((s.must || s.responsibilities || []) as string[]).map((m, i) => (
                          <li key={i} className="text-xs text-zinc-700 flex items-center gap-1"><span className="text-green-500">•</span> {m}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-red-500 uppercase mb-1">🚫 Must Not</h3>
                      <ul className="space-y-0.5">
                        {((s.mustNot || []) as string[]).map((m, i) => (
                          <li key={i} className="text-xs text-red-600 flex items-center gap-1"><span className="text-red-400">•</span> {m}</li>
                        ))}
                      </ul>
                    </div>
                    {"can" in s && (
                      <div>
                        <h3 className="text-xs font-bold text-blue-500 uppercase mb-1">🔵 Can</h3>
                        <ul className="space-y-0.5">
                          {(s.can as string[]).map((c, i) => (
                            <li key={i} className="text-xs text-zinc-700 flex items-center gap-1"><span className="text-blue-400">•</span> {c}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {"decisionTypes" in s && (
                      <div>
                        <h3 className="text-xs font-bold text-blue-500 uppercase mb-1">Decision Types</h3>
                        <div className="flex gap-1.5">
                          {(s.decisionTypes as string[]).map((d, i) => (
                            <span key={i} className="px-2 py-1 rounded bg-indigo-50 text-indigo-700 text-xs font-medium">{d}</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  {"priority" in s && (
                    <div className="bg-green-50 border border-green-200 rounded-md px-3 py-2 text-xs text-green-800 font-medium">
                      🎯 Priority: {s.priority as string}
                    </div>
                  )}
                </div>
              )}

              {/* Error Codes */}
              {"pattern" in s && (
                <div className="space-y-3">
                  <div className="bg-zinc-900 text-green-400 font-mono text-sm px-4 py-3 rounded-lg">
                    {s.pattern as string}
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <h3 className="text-xs font-bold text-zinc-500 uppercase mb-1">CODE_CLASS</h3>
                      <div className="flex gap-1">
                        {(s.codeClass as string[]).map((c, i) => (
                          <span key={i} className="px-2 py-1 rounded bg-purple-50 text-purple-700 text-xs font-mono font-bold">{c}</span>
                        ))}
                      </div>
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-zinc-500 uppercase mb-1">AREA</h3>
                      <div className="flex flex-wrap gap-1">
                        {(s.area as string[]).map((a, i) => (
                          <span key={i} className="px-2 py-1 rounded bg-amber-50 text-amber-700 text-xs font-mono font-bold">{a}</span>
                        ))}
                      </div>
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-zinc-500 uppercase mb-1">ErrorType</h3>
                      <div className="flex flex-wrap gap-1">
                        {(s.errorTypes as string[]).map((e, i) => (
                          <span key={i} className="px-1.5 py-0.5 rounded bg-red-50 text-red-700 text-xs font-mono">{e}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <ul className="space-y-0.5">
                    {(s.rules as string[]).map((r, i) => (
                      <li key={i} className="text-xs text-zinc-700 flex items-center gap-1.5"><span className="text-blue-500">▸</span> {r}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Observability */}
              {"fields" in s && !("mustDefine" in s) && !("pattern" in s) && (
                <div className="space-y-3">
                  <div>
                    <h3 className="text-xs font-bold text-zinc-500 uppercase mb-1">Required Fields</h3>
                    <div className="flex flex-wrap gap-1.5">
                      {(s.fields as string[]).map((f, i) => (
                        <span key={i} className="px-2 py-1 rounded bg-teal-50 text-teal-700 text-xs font-mono">{f}</span>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <h3 className="text-xs font-bold text-zinc-500 uppercase mb-1">Metric</h3>
                      <code className="text-xs bg-zinc-100 px-2 py-1 rounded font-mono text-zinc-800">{s.metric as string}</code>
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-zinc-500 uppercase mb-1">Outcomes</h3>
                      <div className="flex gap-1.5">
                        {(s.outcomes as string[]).map((o, i) => (
                          <span key={i} className="px-2 py-1 rounded bg-green-50 text-green-700 text-xs font-medium">{o}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Testing / Release / AI Employee / Guardrails / Prompt */}
              {"node" in s && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <h3 className="text-xs font-bold text-zinc-500 uppercase mb-1">Node</h3>
                      <ul className="space-y-0.5">
                        {(s.node as string[]).map((n, i) => (
                          <li key={i} className="text-xs text-zinc-700 flex items-center gap-1.5"><span className="text-green-500">•</span> {n}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-zinc-500 uppercase mb-1">API</h3>
                      <ul className="space-y-0.5">
                        {(s.api as string[]).map((a, i) => (
                          <li key={i} className="text-xs text-zinc-700 flex items-center gap-1.5"><span className="text-green-500">•</span> {a}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                  <ul className="space-y-0.5">
                    {(s.rules as string[]).map((r, i) => (
                      <li key={i} className="text-xs text-zinc-700 flex items-center gap-1.5"><span className="text-blue-500">▸</span> {r}</li>
                    ))}
                  </ul>
                </div>
              )}

              {"caughtAt" in s && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <h3 className="text-xs font-bold text-zinc-500 uppercase mb-1">Errors Caught At</h3>
                      <div className="flex gap-1.5">
                        {(s.caughtAt as string[]).map((c, i) => (
                          <span key={i} className="px-2 py-1 rounded bg-red-50 text-red-700 text-xs font-medium">{c}</span>
                        ))}
                      </div>
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-zinc-500 uppercase mb-1">Must Support</h3>
                      <ul className="space-y-0.5">
                        {(s.mustSupport as string[]).map((m, i) => (
                          <li key={i} className="text-xs text-zinc-700 flex items-center gap-1.5"><span className="text-green-500">•</span> {m}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                  <div className="bg-amber-50 border border-amber-200 rounded-md px-3 py-2 text-xs text-amber-800 font-bold">
                    ⚡ {s.principle as string}
                  </div>
                </div>
              )}

              {"mustUse" in s && (
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <h3 className="text-xs font-bold text-green-600 uppercase mb-1">✅ Must</h3>
                    <ul className="space-y-0.5">
                      {(s.must as string[]).map((m, i) => (
                        <li key={i} className="text-xs text-zinc-700 flex items-center gap-1"><span className="text-green-500">•</span> {m}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-red-500 uppercase mb-1">🚫 Must Not</h3>
                    <ul className="space-y-0.5">
                      {(s.mustNot as string[]).map((m, i) => (
                        <li key={i} className="text-xs text-red-600 flex items-center gap-1"><span className="text-red-400">•</span> {m}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-blue-500 uppercase mb-1">🔵 Must Use</h3>
                    <ul className="space-y-0.5">
                      {(s.mustUse as string[]).map((m, i) => (
                        <li key={i} className="text-xs text-zinc-700 flex items-center gap-1"><span className="text-blue-400">•</span> {m}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {"forbidden" in s && !("layers" in s) && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <h3 className="text-xs font-bold text-red-500 uppercase mb-1">🚫 Forbidden</h3>
                    <ul className="space-y-0.5">
                      {(s.forbidden as string[]).map((f, i) => (
                        <li key={i} className="text-xs text-red-600 flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" /> {f}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-green-600 uppercase mb-1">✅ Required</h3>
                    <ul className="space-y-0.5">
                      {(s.required as string[]).map((r, i) => (
                        <li key={i} className="text-xs text-zinc-700 flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-green-400 shrink-0" /> {r}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {"allAiTasksMust" in s && (
                <div className="space-y-3">
                  <div>
                    <h3 className="text-xs font-bold text-zinc-500 uppercase mb-1">All AI Tasks Must</h3>
                    <ul className="space-y-0.5">
                      {(s.allAiTasksMust as string[]).map((a, i) => (
                        <li key={i} className="text-xs text-zinc-700 flex items-center gap-1.5"><span className="text-blue-500">▸</span> {a}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-zinc-500 uppercase mb-1">Memory Bank Must Store</h3>
                    <div className="flex gap-1.5">
                      {(s.memoryBankMustStore as string[]).map((m, i) => (
                        <span key={i} className="px-2 py-1 rounded bg-indigo-50 text-indigo-700 text-xs font-medium">{m}</span>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </Card>
          ))}
      </main>
    </div>
  );
}
