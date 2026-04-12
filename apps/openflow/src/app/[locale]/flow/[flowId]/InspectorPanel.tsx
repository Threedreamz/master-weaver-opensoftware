"use client";

import { useState, useEffect } from "react";
import type { FlowStep } from "@opensoftware/openflow-core";
import InspectorContent from "./InspectorContent";
import InspectorSettings from "./InspectorSettings";
import InspectorDesign from "./InspectorDesign";

// ─── Inspector Panel (3-Tab Wrapper) ─────────────────────────────────────────

type InspectorTab = "inhalt" | "einstellungen" | "design";

const INSPECTOR_TABS: { id: InspectorTab; label: string }[] = [
  { id: "inhalt", label: "Inhalt" },
  { id: "einstellungen", label: "Einstellungen" },
  { id: "design", label: "Design" },
];

interface InspectorPanelProps {
  step: FlowStep;
  onStepChange: (step: FlowStep) => void;
  /** Currently selected block ID from the canvas */
  selectedComponentId: string | null;
  onComponentSelect: (id: string | null) => void;
  allSteps?: FlowStep[];
}

export default function InspectorPanel({
  step,
  onStepChange,
  selectedComponentId,
  onComponentSelect,
  allSteps,
}: InspectorPanelProps) {
  const [activeTab, setActiveTab] = useState<InspectorTab>("inhalt");

  // When a component gets selected in the canvas, switch to "Inhalt" tab
  useEffect(() => {
    if (selectedComponentId) {
      setActiveTab("inhalt");
    }
  }, [selectedComponentId]);

  return (
    <div className="flex flex-col flex-1">
      {/* Tab Bar */}
      <div className="flex border-b border-gray-200 shrink-0">
        {INSPECTOR_TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 px-3 py-2 text-xs font-medium transition-colors ${
              activeTab === tab.id
                ? "text-indigo-600 border-b-2 border-indigo-600"
                : "text-gray-500 hover:text-gray-700 border-b-2 border-transparent"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === "inhalt" && (
          <InspectorContent
            step={step}
            onStepChange={onStepChange}
            selectedComponentId={selectedComponentId}
            onComponentSelect={onComponentSelect}
            allSteps={allSteps}
          />
        )}
        {activeTab === "einstellungen" && (
          <InspectorSettings
            step={step}
            onStepChange={onStepChange}
            selectedComponentId={selectedComponentId}
            onComponentSelect={onComponentSelect}
          />
        )}
        {activeTab === "design" && (
          <InspectorDesign
            step={step}
            onStepChange={onStepChange}
            selectedComponentId={selectedComponentId}
            onComponentSelect={onComponentSelect}
          />
        )}
      </div>
    </div>
  );
}
