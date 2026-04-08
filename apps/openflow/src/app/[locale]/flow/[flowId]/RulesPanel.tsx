"use client";

import { useState, useCallback } from "react";
import { X, Plus, ChevronDown, ChevronRight } from "lucide-react";
import type { FlowDefinition, FlowEdge, ConditionType } from "@opensoftware/openflow-core";

// ─── Condition Type Labels (German) ──────────────────────────────────────────

const CONDITION_LABELS: Record<ConditionType, string> = {
  always: "Immer",
  equals: "ist gleich",
  not_equals: "ist nicht gleich",
  contains: "enthalt",
  not_contains: "enthalt nicht",
  gt: "grosser als",
  lt: "kleiner als",
  gte: "grosser oder gleich",
  lte: "kleiner oder gleich",
  regex: "entspricht Regex",
  is_empty: "ist leer",
  is_not_empty: "ist nicht leer",
};

const CONDITION_TYPES: ConditionType[] = [
  "always",
  "equals",
  "not_equals",
  "contains",
  "not_contains",
  "gt",
  "lt",
  "gte",
  "lte",
  "regex",
  "is_empty",
  "is_not_empty",
];

const VALUE_NOT_NEEDED: ConditionType[] = ["always", "is_empty", "is_not_empty"];
const FIELD_NOT_NEEDED: ConditionType[] = ["always"];

// ─── Props ───────────────────────────────────────────────────────────────────

interface RulesPanelProps {
  flowData: FlowDefinition;
  onEdgesChange: (edges: FlowEdge[]) => void;
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function RulesPanel({ flowData, onEdgesChange }: RulesPanelProps) {
  const [expandedSteps, setExpandedSteps] = useState<Record<string, boolean>>({});
  const [savingEdge, setSavingEdge] = useState<string | null>(null);

  const flowId = flowData.id;
  const steps = flowData.steps;
  const edges = flowData.edges;

  // Collect all fieldKeys from all components across all steps
  const allFieldKeys = steps.flatMap((step) =>
    (step.components ?? []).map((c) => ({
      fieldKey: c.fieldKey,
      label: c.label || c.fieldKey,
      stepLabel: step.label,
    }))
  );

  // Non-end steps that can have outgoing rules
  const sourceSteps = steps.filter((s) => s.type !== "end");

  const toggleStep = (stepId: string) => {
    setExpandedSteps((prev) => ({ ...prev, [stepId]: !prev[stepId] }));
  };

  // ─── API Helpers ─────────────────────────────────────────────────────────

  const createEdge = useCallback(
    async (sourceStepId: string) => {
      // Default target: next step in order, or first step
      const sourceIndex = steps.findIndex((s) => s.id === sourceStepId);
      const nextStep = steps.find(
        (s, i) => i > sourceIndex && s.type !== "start"
      );
      const targetStepId = nextStep?.id ?? steps.find((s) => s.type === "end")?.id ?? steps[0]?.id;
      if (!targetStepId) return;

      const existingForSource = edges.filter((e) => e.sourceStepId === sourceStepId);
      const priority = existingForSource.length;

      try {
        const res = await fetch(`/api/flows/${flowId}/edges`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sourceStepId,
            targetStepId,
            conditionType: "equals",
            conditionFieldKey: allFieldKeys[0]?.fieldKey ?? "",
            conditionValue: "",
            priority,
          }),
        });
        if (!res.ok) throw new Error("Failed to create edge");
        const newEdge = await res.json();
        onEdgesChange([...edges, newEdge]);
      } catch (err) {
        console.error("Failed to create rule:", err);
      }
    },
    [flowId, edges, steps, allFieldKeys, onEdgesChange]
  );

  const updateEdge = useCallback(
    async (edgeId: string, updates: Partial<FlowEdge>) => {
      setSavingEdge(edgeId);
      try {
        const res = await fetch(`/api/flows/${flowId}/edges`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ edgeId, ...updates }),
        });
        if (!res.ok) throw new Error("Failed to update edge");
        const updated = await res.json();
        onEdgesChange(edges.map((e) => (e.id === edgeId ? updated : e)));
      } catch (err) {
        console.error("Failed to update rule:", err);
      } finally {
        setSavingEdge(null);
      }
    },
    [flowId, edges, onEdgesChange]
  );

  const deleteEdge = useCallback(
    async (edgeId: string) => {
      try {
        const res = await fetch(`/api/flows/${flowId}/edges?edgeId=${edgeId}`, {
          method: "DELETE",
        });
        if (!res.ok) throw new Error("Failed to delete edge");
        onEdgesChange(edges.filter((e) => e.id !== edgeId));
      } catch (err) {
        console.error("Failed to delete rule:", err);
      }
    },
    [flowId, edges, onEdgesChange]
  );

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-gray-100">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
          Regeln
        </p>
        <p className="text-xs text-gray-400 mt-1">
          Bedingte Verzweigungslogik pro Schritt
        </p>
      </div>

      <div className="flex-1 overflow-y-auto">
        {sourceSteps.map((step) => {
          const stepEdges = edges
            .filter((e) => e.sourceStepId === step.id)
            .sort((a, b) => a.priority - b.priority);
          const isExpanded = expandedSteps[step.id] ?? false;

          // Separate conditional edges from "always" default edges
          const conditionalEdges = stepEdges.filter(
            (e) => e.conditionType !== "always"
          );
          const defaultEdge = stepEdges.find(
            (e) => e.conditionType === "always"
          );

          return (
            <div key={step.id} className="border-b border-gray-100">
              {/* Step Header */}
              <button
                onClick={() => toggleStep(step.id)}
                className="w-full flex items-center gap-2 px-4 py-2.5 text-left hover:bg-gray-50 transition-colors"
              >
                {isExpanded ? (
                  <ChevronDown size={14} className="text-gray-400 shrink-0" />
                ) : (
                  <ChevronRight size={14} className="text-gray-400 shrink-0" />
                )}
                <span className="text-xs font-semibold text-gray-700 truncate flex-1">
                  {step.label}
                </span>
                <span className="text-xs text-gray-400 bg-gray-100 rounded-full px-1.5 py-0.5 shrink-0">
                  {stepEdges.length}
                </span>
              </button>

              {isExpanded && (
                <div className="px-3 pb-3 space-y-2">
                  {/* Conditional Rules */}
                  {conditionalEdges.map((edge) => (
                    <RuleRow
                      key={edge.id}
                      edge={edge}
                      allFieldKeys={allFieldKeys}
                      steps={steps}
                      isSaving={savingEdge === edge.id}
                      onUpdate={(updates) => updateEdge(edge.id, updates)}
                      onDelete={() => deleteEdge(edge.id)}
                    />
                  ))}

                  {/* Default Rule (always) */}
                  {defaultEdge && (
                    <div className="flex items-center gap-1.5 px-2 py-1.5 bg-gray-50 rounded-lg border border-gray-200">
                      <span className="text-xs text-gray-400 italic flex-1">
                        In allen anderen Fallen{" "}
                        <span className="font-medium text-gray-500">
                          &rarr;{" "}
                          {steps.find((s) => s.id === defaultEdge.targetStepId)
                            ?.label ?? "Nachste Seite"}
                        </span>
                      </span>
                    </div>
                  )}

                  {/* Add Rule Button */}
                  <button
                    onClick={() => createEdge(step.id)}
                    className="w-full flex items-center justify-center gap-1 px-2 py-1.5 text-xs text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-lg border border-dashed border-indigo-300 transition-colors"
                  >
                    <Plus size={12} />
                    Regel hinzufugen
                  </button>
                </div>
              )}
            </div>
          );
        })}

        {sourceSteps.length === 0 && (
          <div className="px-4 py-6 text-center">
            <p className="text-xs text-gray-400 italic">
              Keine Schritte vorhanden. Fugen Sie zuerst Schritte hinzu.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Rule Row Component ──────────────────────────────────────────────────────

interface RuleRowProps {
  edge: FlowEdge;
  allFieldKeys: { fieldKey: string; label: string; stepLabel: string }[];
  steps: FlowDefinition["steps"];
  isSaving: boolean;
  onUpdate: (updates: Partial<FlowEdge>) => void;
  onDelete: () => void;
}

function RuleRow({
  edge,
  allFieldKeys,
  steps,
  isSaving,
  onUpdate,
  onDelete,
}: RuleRowProps) {
  const needsField = !FIELD_NOT_NEEDED.includes(edge.conditionType);
  const needsValue = !VALUE_NOT_NEEDED.includes(edge.conditionType);
  const targetSteps = steps.filter((s) => s.type !== "start");

  return (
    <div
      className={`relative rounded-lg border border-gray-200 bg-white p-2 space-y-1.5 ${
        isSaving ? "opacity-60" : ""
      }`}
    >
      {/* Priority badge */}
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-gray-400 font-mono">
          #{edge.priority}
        </span>
        <button
          onClick={onDelete}
          className="p-0.5 text-gray-300 hover:text-red-500 transition-colors"
          title="Regel entfernen"
        >
          <X size={12} />
        </button>
      </div>

      {/* WENN row */}
      <div className="space-y-1">
        <span className="text-[10px] font-semibold text-gray-500 uppercase">
          WENN
        </span>

        {/* Field selector */}
        {needsField && (
          <select
            value={edge.conditionFieldKey ?? ""}
            onChange={(e) => onUpdate({ conditionFieldKey: e.target.value })}
            className="w-full text-xs border border-gray-200 rounded px-1.5 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-400"
          >
            <option value="">-- Feld wahlen --</option>
            {allFieldKeys.map((f) => (
              <option key={f.fieldKey} value={f.fieldKey}>
                {f.label} ({f.stepLabel})
              </option>
            ))}
          </select>
        )}

        {/* Operator selector */}
        <select
          value={edge.conditionType}
          onChange={(e) =>
            onUpdate({ conditionType: e.target.value as ConditionType })
          }
          className="w-full text-xs border border-gray-200 rounded px-1.5 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-400"
        >
          {CONDITION_TYPES.filter((ct) => ct !== "always").map((ct) => (
            <option key={ct} value={ct}>
              {CONDITION_LABELS[ct]}
            </option>
          ))}
        </select>

        {/* Value input */}
        {needsValue && (
          <input
            type="text"
            value={edge.conditionValue ?? ""}
            onChange={(e) => onUpdate({ conditionValue: e.target.value })}
            placeholder="Wert"
            className="w-full text-xs border border-gray-200 rounded px-1.5 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-400"
          />
        )}
      </div>

      {/* DANN row */}
      <div className="space-y-1">
        <span className="text-[10px] font-semibold text-gray-500 uppercase">
          DANN &rarr;
        </span>
        <select
          value={edge.targetStepId}
          onChange={(e) => onUpdate({ targetStepId: e.target.value })}
          className="w-full text-xs border border-gray-200 rounded px-1.5 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-400"
        >
          {targetSteps.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
