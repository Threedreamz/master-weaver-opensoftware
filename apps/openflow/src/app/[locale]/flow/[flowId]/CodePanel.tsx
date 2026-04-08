"use client";

import { useState } from "react";
import type { FlowSettings } from "@opensoftware/openflow-core";

type CodeTab = "css" | "js" | "head";

const CODE_TABS: { id: CodeTab; label: string; info: string }[] = [
  { id: "css", label: "CSS", info: "Benutzerdefiniertes CSS für diesen Flow" },
  { id: "js", label: "JS", info: "JavaScript wird nach dem Laden des Flows ausgeführt" },
  { id: "head", label: "Head", info: "HTML wird in den <head> Bereich eingefügt" },
];

interface CodePanelProps {
  settings: FlowSettings;
  onChange: (settings: Partial<FlowSettings>) => void;
}

export default function CodePanel({ settings, onChange }: CodePanelProps) {
  const [activeTab, setActiveTab] = useState<CodeTab>("css");

  const valueMap: Record<CodeTab, string> = {
    css: settings.customCSS ?? "",
    js: settings.customJS ?? "",
    head: settings.customHead ?? "",
  };

  const fieldMap: Record<CodeTab, keyof FlowSettings> = {
    css: "customCSS",
    js: "customJS",
    head: "customHead",
  };

  const currentTab = CODE_TABS.find((t) => t.id === activeTab)!;

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-gray-100">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
          Code
        </p>
      </div>

      {/* Tab bar */}
      <div className="flex border-b border-gray-100">
        {CODE_TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 px-3 py-2 text-xs font-medium transition-colors ${
              activeTab === tab.id
                ? "text-indigo-600 border-b-2 border-indigo-600"
                : "text-gray-400 hover:text-gray-600"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Info text */}
      <div className="px-4 py-2">
        <p className="text-xs text-gray-400">{currentTab.info}</p>
      </div>

      {/* Code editor */}
      <div className="flex-1 px-3 pb-3">
        <textarea
          value={valueMap[activeTab]}
          onChange={(e) => {
            onChange({ [fieldMap[activeTab]]: e.target.value });
          }}
          spellCheck={false}
          className="w-full h-48 bg-gray-900 text-green-400 text-xs font-mono p-3 rounded-lg border border-gray-700 resize-y outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 placeholder-gray-600"
          placeholder={
            activeTab === "css"
              ? "/* Custom CSS */\n.flow-renderer {\n  \n}"
              : activeTab === "js"
              ? "// Custom JavaScript\nconsole.log('Flow loaded');"
              : "<!-- Custom head HTML -->\n<meta name=\"...\" content=\"...\">"
          }
        />
      </div>
    </div>
  );
}
