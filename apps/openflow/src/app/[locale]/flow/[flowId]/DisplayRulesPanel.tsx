"use client";

import { useState } from "react";
import { X, Plus, ChevronDown, ChevronRight } from "lucide-react";
import type {
  FlowDefinition,
  DisplayRule,
  DisplayRuleCondition,
  ConditionType,
} from "@opensoftware/openflow-core";
import { CONTACT_FORM_SUBFIELDS } from "@opensoftware/openflow-core";

// ─── Constants ────────────────────────────────────────────────────────────────

const CONDITION_LABELS: Record<ConditionType, string> = {
  always: "Immer",
  equals: "ist gleich",
  not_equals: "ist nicht gleich",
  contains: "enthält",
  not_contains: "enthält nicht",
  gt: "größer als",
  lt: "kleiner als",
  gte: "größer oder gleich",
  lte: "kleiner oder gleich",
  regex: "entspricht Regex",
  is_empty: "ist leer",
  is_not_empty: "ist nicht leer",
};

const VALUE_NOT_NEEDED: ConditionType[] = ["always", "is_empty", "is_not_empty"];

// ─── Props ────────────────────────────────────────────────────────────────────

interface DisplayRulesPanelProps {
  flowData: FlowDefinition;
  onChange: (rules: DisplayRule[]) => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildAllFields(flowData: FlowDefinition) {
  const fields: {
    fieldKey: string;
    label: string;
    stepLabel: string;
    stepId: string;
    cards?: { key: string; title: string }[];
  }[] = [];
  for (const step of flowData.steps) {
    if (step.type === "start" || step.type === "end") continue;
    for (const comp of step.components) {
      if (!comp.fieldKey) continue;
      const cards =
        comp.componentType === "card-selector"
          ? ((comp.config as Record<string, unknown>)?.cards as
              | { key: string; title: string }[]
              | undefined)
          : undefined;
      fields.push({
        fieldKey: comp.fieldKey,
        label: comp.label || comp.fieldKey,
        stepLabel: step.label || step.id,
        stepId: step.id,
        cards,
      });
    }
  }
  return fields;
}

function buildAllComponents(flowData: FlowDefinition) {
  const result: { stepId: string; stepLabel: string; componentId: string; subFieldKey?: string; label: string; componentType: string; parentLabel?: string }[] = [];
  for (const step of flowData.steps) {
    if (step.type === "start" || step.type === "end") continue;
    for (const comp of step.components) {
      const compLabel = comp.label || comp.fieldKey || comp.componentType;
      result.push({
        stepId: step.id,
        stepLabel: step.label || step.id,
        componentId: comp.id,
        label: compLabel,
        componentType: comp.componentType,
      });
      if (comp.componentType === "contact-form" || comp.componentType === "ContactForm") {
        for (const sub of CONTACT_FORM_SUBFIELDS) {
          result.push({
            stepId: step.id,
            stepLabel: step.label || step.id,
            componentId: comp.id,
            subFieldKey: sub.key,
            label: sub.label,
            componentType: comp.componentType,
            parentLabel: compLabel,
          });
        }
        const checkboxes = (comp.config as { checkboxes?: { id: string; label: string }[] } | undefined)?.checkboxes ?? [];
        for (const cb of checkboxes) {
          result.push({
            stepId: step.id,
            stepLabel: step.label || step.id,
            componentId: comp.id,
            subFieldKey: `cb:${cb.id}`,
            label: cb.label || cb.id,
            componentType: comp.componentType,
            parentLabel: compLabel,
          });
        }
      }
    }
  }
  return result;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function DisplayRulesPanel({ flowData, onChange }: DisplayRulesPanelProps) {
  const rules = flowData.displayRules ?? [];
  const [expandedRules, setExpandedRules] = useState<Set<string>>(new Set());

  const allFields = buildAllFields(flowData);
  const allComponents = buildAllComponents(flowData);

  // Group components by step for the target picker
  const componentsByStep = flowData.steps
    .filter((s) => s.type !== "start" && s.type !== "end")
    .map((step) => ({
      stepId: step.id,
      stepLabel: step.label || step.id,
      components: allComponents.filter((c) => c.stepId === step.id),
    }))
    .filter((s) => s.components.length > 0);

  function updateRule(id: string, patch: Partial<DisplayRule>) {
    onChange(rules.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  function deleteRule(id: string) {
    onChange(rules.filter((r) => r.id !== id));
  }

  function addRule() {
    const newRule: DisplayRule = {
      id: crypto.randomUUID(),
      conditions: [
        {
          id: crypto.randomUUID(),
          fieldKey: allFields[0]?.fieldKey ?? "",
          conditionType: "equals",
          conditionValue: "",
        },
      ],
      conditionLogic: "AND",
      targets: [],
      action: "show",
    };
    const updated = [...rules, newRule];
    onChange(updated);
    setExpandedRules((prev) => new Set([...prev, newRule.id]));
  }

  function toggleExpand(id: string) {
    setExpandedRules((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="px-4 py-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
          Anzeigeregeln
        </p>
        <span className="text-[10px] text-gray-400">{rules.length} Regel{rules.length !== 1 ? "n" : ""}</span>
      </div>
      <p className="text-[11px] text-gray-400 leading-relaxed">
        Definiere zentral: wenn Bedingung erfüllt → zeige/verstecke Felder auf beliebigen Seiten.
      </p>

      {rules.length === 0 && (
        <p className="text-xs text-gray-400 italic">Keine Anzeigeregeln. Klicke auf + um eine Regel hinzuzufügen.</p>
      )}

      <div className="space-y-2">
        {rules.map((rule, idx) => (
          <RuleCard
            key={rule.id}
            rule={rule}
            index={idx}
            expanded={expandedRules.has(rule.id)}
            allFields={allFields}
            componentsByStep={componentsByStep}
            onToggle={() => toggleExpand(rule.id)}
            onUpdate={(patch) => updateRule(rule.id, patch)}
            onDelete={() => deleteRule(rule.id)}
          />
        ))}
      </div>

      <button
        onClick={addRule}
        className="flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-800 transition-colors"
      >
        <Plus size={12} />
        Anzeigeregel hinzufügen
      </button>
    </div>
  );
}

// ─── Rule Card ────────────────────────────────────────────────────────────────

interface RuleCardProps {
  rule: DisplayRule;
  index: number;
  expanded: boolean;
  allFields: ReturnType<typeof buildAllFields>;
  componentsByStep: { stepId: string; stepLabel: string; components: { stepId: string; stepLabel: string; componentId: string; subFieldKey?: string; label: string; componentType: string; parentLabel?: string }[] }[];
  onToggle: () => void;
  onUpdate: (patch: Partial<DisplayRule>) => void;
  onDelete: () => void;
}

function RuleCard({ rule, index, expanded, allFields, componentsByStep, onToggle, onUpdate, onDelete }: RuleCardProps) {
  const selectClass =
    "text-xs border border-gray-200 rounded px-1.5 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-400";

  function addCondition() {
    const newCond: DisplayRuleCondition = {
      id: crypto.randomUUID(),
      fieldKey: allFields[0]?.fieldKey ?? "",
      conditionType: "equals",
      conditionValue: "",
    };
    onUpdate({ conditions: [...rule.conditions, newCond] });
  }

  function updateCondition(condId: string, patch: Partial<DisplayRuleCondition>) {
    onUpdate({
      conditions: rule.conditions.map((c) => (c.id === condId ? { ...c, ...patch } : c)),
    });
  }

  function removeCondition(condId: string) {
    onUpdate({ conditions: rule.conditions.filter((c) => c.id !== condId) });
  }

  function toggleTarget(stepId: string, componentId: string, subFieldKey: string | undefined, checked: boolean) {
    if (checked) {
      onUpdate({ targets: [...rule.targets, { stepId, componentId, subFieldKey }] });
    } else {
      onUpdate({ targets: rule.targets.filter((t) => !(t.componentId === componentId && t.stepId === stepId && t.subFieldKey === subFieldKey)) });
    }
  }

  function toggleAllInStep(stepId: string, components: { componentId: string; subFieldKey?: string }[], checked: boolean) {
    if (checked) {
      const existing = new Set(
        rule.targets
          .filter((t) => t.stepId === stepId)
          .map((t) => `${t.componentId}::${t.subFieldKey ?? ""}`)
      );
      const newTargets = components
        .filter((c) => !existing.has(`${c.componentId}::${c.subFieldKey ?? ""}`))
        .map((c) => ({ stepId, componentId: c.componentId, subFieldKey: c.subFieldKey }));
      onUpdate({ targets: [...rule.targets, ...newTargets] });
    } else {
      onUpdate({ targets: rule.targets.filter((t) => t.stepId !== stepId) });
    }
  }

  // Summary line for collapsed view
  const targetCount = rule.targets.length;
  const firstCond = rule.conditions[0];
  const summaryWenn = firstCond
    ? `${firstCond.fieldKey} ${CONDITION_LABELS[firstCond.conditionType]}${firstCond.conditionValue ? ` "${firstCond.conditionValue}"` : ""}`
    : "—";

  return (
    <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
      {/* Header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2 min-w-0">
          {expanded ? <ChevronDown size={12} className="shrink-0 text-gray-400" /> : <ChevronRight size={12} className="shrink-0 text-gray-400" />}
          <span className="text-[10px] text-gray-400 font-mono shrink-0">#{index + 1}</span>
          {!expanded && (
            <span className="text-xs text-gray-600 truncate">
              {summaryWenn} → {rule.action === "show" ? "zeige" : "verstecke"} {targetCount} Feld{targetCount !== 1 ? "er" : ""}
            </span>
          )}
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="shrink-0 p-0.5 text-gray-300 hover:text-red-500 transition-colors ml-2"
          title="Regel löschen"
        >
          <X size={12} />
        </button>
      </button>

      {expanded && (
        <div className="px-3 pb-3 space-y-3 border-t border-gray-100">
          {/* WENN */}
          <div className="space-y-1.5 pt-2">
            <span className="text-[10px] font-semibold text-gray-500 uppercase">WENN</span>
            {rule.conditions.map((cond, idx) => {
              const fieldMeta = allFields.find((f) => f.fieldKey === cond.fieldKey);
              const cardOptions = fieldMeta?.cards ?? [];
              const needsValue = !VALUE_NOT_NEEDED.includes(cond.conditionType);
              return (
                <div key={cond.id} className="flex items-center gap-1 flex-wrap">
                  {rule.conditions.length > 1 && (
                    <span className="text-[10px] text-gray-400 w-8 text-right shrink-0">
                      {idx === 0 ? "" : rule.conditionLogic}
                    </span>
                  )}
                  <select
                    value={cond.fieldKey}
                    onChange={(e) => updateCondition(cond.id, { fieldKey: e.target.value, conditionValue: "" })}
                    className={`${selectClass} flex-1 min-w-0`}
                  >
                    <option value="">Feld wählen…</option>
                    {allFields.map((f) => (
                      <option key={f.fieldKey} value={f.fieldKey}>
                        {f.stepLabel}: {f.label}
                      </option>
                    ))}
                  </select>
                  <select
                    value={cond.conditionType}
                    onChange={(e) => updateCondition(cond.id, { conditionType: e.target.value as ConditionType })}
                    className={selectClass}
                  >
                    {(Object.keys(CONDITION_LABELS) as ConditionType[])
                      .filter((t) => t !== "always")
                      .map((t) => (
                        <option key={t} value={t}>{CONDITION_LABELS[t]}</option>
                      ))}
                  </select>
                  {needsValue && (
                    cardOptions.length > 0 ? (
                      <select
                        value={cond.conditionValue ?? ""}
                        onChange={(e) => updateCondition(cond.id, { conditionValue: e.target.value })}
                        className={`${selectClass} w-28`}
                      >
                        <option value="">Wert…</option>
                        {cardOptions.map((card) => (
                          <option key={card.key} value={card.key}>{card.title}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        value={cond.conditionValue ?? ""}
                        onChange={(e) => updateCondition(cond.id, { conditionValue: e.target.value })}
                        placeholder="Wert"
                        className={`${selectClass} w-20`}
                      />
                    )
                  )}
                  {rule.conditions.length > 1 && (
                    <button
                      onClick={() => removeCondition(cond.id)}
                      className="text-gray-300 hover:text-red-500 transition-colors"
                    >
                      <X size={11} />
                    </button>
                  )}
                </div>
              );
            })}

            <div className="flex items-center gap-2 pt-0.5">
              <button
                onClick={addCondition}
                className="text-[11px] text-indigo-600 hover:text-indigo-800 transition-colors"
              >
                + Bedingung
              </button>
              {rule.conditions.length >= 2 && (
                <div className="flex items-center gap-1 ml-auto">
                  <button
                    onClick={() => onUpdate({ conditionLogic: "AND" })}
                    className={`text-[10px] px-1.5 py-0.5 rounded border transition-colors ${rule.conditionLogic === "AND" ? "bg-indigo-50 border-indigo-300 text-indigo-700 font-medium" : "border-gray-200 text-gray-400 hover:border-gray-300"}`}
                  >
                    UND
                  </button>
                  <button
                    onClick={() => onUpdate({ conditionLogic: "OR" })}
                    className={`text-[10px] px-1.5 py-0.5 rounded border transition-colors ${rule.conditionLogic === "OR" ? "bg-indigo-50 border-indigo-300 text-indigo-700 font-medium" : "border-gray-200 text-gray-400 hover:border-gray-300"}`}
                  >
                    ODER
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* DANN */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-semibold text-gray-500 uppercase">DANN</span>
              <select
                value={rule.action}
                onChange={(e) => onUpdate({ action: e.target.value as "show" | "hide" })}
                className={selectClass}
              >
                <option value="show">zeige</option>
                <option value="hide">verstecke</option>
              </select>
            </div>

            {componentsByStep.length === 0 && (
              <p className="text-[11px] text-gray-400 italic">Keine Felder vorhanden.</p>
            )}

            <div className="space-y-2">
              {componentsByStep.map((stepGroup) => {
                const allChecked = stepGroup.components.every((c) =>
                  rule.targets.some((t) => t.componentId === c.componentId && t.stepId === c.stepId && t.subFieldKey === c.subFieldKey)
                );
                const someChecked = stepGroup.components.some((c) =>
                  rule.targets.some((t) => t.componentId === c.componentId && t.stepId === c.stepId && t.subFieldKey === c.subFieldKey)
                );
                return (
                  <div key={stepGroup.stepId}>
                    <label className="flex items-center gap-1.5 cursor-pointer mb-1">
                      <input
                        type="checkbox"
                        checked={allChecked}
                        ref={(el) => { if (el) el.indeterminate = someChecked && !allChecked; }}
                        onChange={(e) => toggleAllInStep(stepGroup.stepId, stepGroup.components, e.target.checked)}
                        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-400 w-3 h-3"
                      />
                      <span className="text-[11px] font-semibold text-gray-600">{stepGroup.stepLabel}</span>
                    </label>
                    <div className="ml-4 space-y-0.5">
                      {stepGroup.components.map((comp) => {
                        const checked = rule.targets.some(
                          (t) => t.componentId === comp.componentId && t.stepId === comp.stepId && t.subFieldKey === comp.subFieldKey
                        );
                        const isSub = !!comp.subFieldKey;
                        return (
                          <label
                            key={`${comp.componentId}::${comp.subFieldKey ?? ""}`}
                            className={`flex items-center gap-1.5 cursor-pointer ${isSub ? "ml-8" : ""}`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(e) => toggleTarget(comp.stepId, comp.componentId, comp.subFieldKey, e.target.checked)}
                              className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-400 w-3 h-3"
                            />
                            <span className="text-xs text-gray-600">{comp.label}</span>
                            {!isSub && <span className="text-[10px] text-gray-400">{comp.componentType}</span>}
                          </label>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
