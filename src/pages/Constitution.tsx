import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "../utils";
import { CONSTITUTION_SECTIONS } from "../data/constitution";

export default function Constitution() {
  const [activeId, setActiveId] = useState(CONSTITUTION_SECTIONS[0]?.id ?? "");

  const activeSection = CONSTITUTION_SECTIONS.find((s) => s.id === activeId);

  return (
    <div className="flex h-full gap-0">
      {/* Sidebar */}
      <aside className="w-56 shrink-0 bg-white border-r border-zinc-200 overflow-y-auto py-3 px-2">
        <h2 className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-2 px-2">
          🏛️ Constitution v1
        </h2>
        <div className="space-y-0.5">
          {CONSTITUTION_SECTIONS.map((s) => (
            <button
              key={s.id}
              onClick={() => setActiveId(s.id)}
              className={cn(
                "w-full text-left px-2 py-1.5 rounded-md text-xs transition-colors",
                activeId === s.id
                  ? "bg-blue-50 text-blue-700 font-medium"
                  : "text-zinc-600 hover:bg-zinc-50"
              )}
            >
              {s.icon} {s.title}
            </button>
          ))}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto px-8 py-6">
        {activeSection ? (
          <article className="prose prose-zinc prose-sm max-w-3xl">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                h1: ({ children }) => (
                  <h1 className="text-2xl font-black text-zinc-900 tracking-tight mb-4 pb-3 border-b border-zinc-200">
                    {children}
                  </h1>
                ),
                h2: ({ children }) => (
                  <h2 className="text-lg font-bold text-zinc-800 mt-6 mb-2">{children}</h2>
                ),
                h3: ({ children }) => (
                  <h3 className="text-base font-semibold text-zinc-700 mt-4 mb-1">{children}</h3>
                ),
                p: ({ children }) => <p className="text-sm text-zinc-700 mb-3 leading-relaxed">{children}</p>,
                ul: ({ children }) => <ul className="text-sm text-zinc-700 space-y-1 mb-3 list-disc pl-5">{children}</ul>,
                ol: ({ children }) => <ol className="text-sm text-zinc-700 space-y-1 mb-3 list-decimal pl-5">{children}</ol>,
                li: ({ children }) => <li className="text-sm text-zinc-700">{children}</li>,
                strong: ({ children }) => <strong className="font-bold text-zinc-900">{children}</strong>,
                code: ({ children, className }) => {
                  const isBlock = className?.includes("language-");
                  if (isBlock) {
                    return (
                      <pre className="bg-zinc-900 text-green-400 rounded-lg px-4 py-3 text-xs font-mono overflow-x-auto my-3">
                        <code>{children}</code>
                      </pre>
                    );
                  }
                  return <code className="bg-zinc-100 text-zinc-800 px-1.5 py-0.5 rounded text-xs font-mono">{children}</code>;
                },
                blockquote: ({ children }) => (
                  <blockquote className="border-l-4 border-blue-400 bg-blue-50 pl-4 py-2 pr-3 rounded-r-lg my-3 text-sm text-blue-800 font-medium">
                    {children}
                  </blockquote>
                ),
                table: ({ children }) => (
                  <div className="overflow-x-auto my-3">
                    <table className="min-w-full text-sm border border-zinc-200 rounded-lg overflow-hidden">
                      {children}
                    </table>
                  </div>
                ),
                thead: ({ children }) => <thead className="bg-zinc-50 border-b border-zinc-200">{children}</thead>,
                th: ({ children }) => <th className="px-4 py-2 text-left text-xs font-semibold text-zinc-700">{children}</th>,
                td: ({ children }) => <td className="px-4 py-2 text-xs text-zinc-600 border-b border-zinc-100">{children}</td>,
                hr: () => <hr className="my-4 border-zinc-200" />,
              }}
            >
              {activeSection.content}
            </ReactMarkdown>
          </article>
        ) : (
          <div className="text-zinc-400 text-sm">Select a section from the sidebar</div>
        )}
      </main>
    </div>
  );
}
