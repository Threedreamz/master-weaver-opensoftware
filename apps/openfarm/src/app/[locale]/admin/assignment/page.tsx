"use client";

import { useState, useEffect, useTransition } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  X,
  Check,
  Loader2,
  ClipboardList,
} from "lucide-react";

interface AssignmentRule {
  id: string;
  name: string;
  priority: number;
  conditions: {
    technology?: string;
    materialCategory?: string;
    minBuildVolume?: number;
  };
  preferredPrinterIds: string[];
  enabled: boolean;
}

interface PrinterOption {
  id: string;
  name: string;
  technology: string;
}

const TECHNOLOGIES = ["any", "fdm", "sla", "sls"] as const;
const MATERIAL_CATEGORIES = ["any", "PLA", "ABS", "PETG", "Resin", "Nylon", "TPU"] as const;

export default function AssignmentPage() {
  const [isPending, startTransition] = useTransition();
  const [rules, setRules] = useState<AssignmentRule[]>([]);
  const [printers, setPrinters] = useState<PrinterOption[]>([]);
  const [editingRule, setEditingRule] = useState<Partial<AssignmentRule> | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [rulesRes, printersRes] = await Promise.all([
          fetch("/api/openfarm/assignment-rules"),
          fetch("/api/openfarm/printers"),
        ]);
        if (rulesRes.ok) {
          const data = await rulesRes.json();
          setRules(data);
        }
        if (printersRes.ok) {
          const data = await printersRes.json();
          setPrinters(data);
        }
      } catch {
        // Silently handle fetch errors
      }
      setLoading(false);
    }
    fetchData();
  }, []);

  function startCreate() {
    setEditingRule({
      name: "",
      priority: 5,
      conditions: { technology: "any", materialCategory: "any" },
      preferredPrinterIds: [],
      enabled: true,
    });
    setIsCreating(true);
  }

  function startEdit(rule: AssignmentRule) {
    setEditingRule({ ...rule, conditions: { ...rule.conditions } });
    setIsCreating(false);
  }

  function cancelEdit() {
    setEditingRule(null);
    setIsCreating(false);
  }

  async function handleSave() {
    if (!editingRule?.name) return;

    startTransition(async () => {
      try {
        const method = isCreating ? "POST" : "PUT";
        const url = isCreating
          ? "/api/openfarm/assignment-rules"
          : `/api/openfarm/assignment-rules/${editingRule.id}`;

        const res = await fetch(url, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(editingRule),
        });

        if (res.ok) {
          const saved = await res.json();
          if (isCreating) {
            setRules((prev) => [...prev, saved]);
          } else {
            setRules((prev) => prev.map((r) => (r.id === saved.id ? saved : r)));
          }
          cancelEdit();
        }
      } catch {
        // Handle error
      }
    });
  }

  async function handleDelete(id: string) {
    startTransition(async () => {
      try {
        const res = await fetch(`/api/openfarm/assignment-rules/${id}`, {
          method: "DELETE",
        });
        if (res.ok) {
          setRules((prev) => prev.filter((r) => r.id !== id));
        }
      } catch {
        // Handle error
      }
    });
  }

  function togglePrinter(printerId: string) {
    if (!editingRule) return;
    const current = editingRule.preferredPrinterIds ?? [];
    const updated = current.includes(printerId)
      ? current.filter((id) => id !== printerId)
      : [...current, printerId];
    setEditingRule({ ...editingRule, preferredPrinterIds: updated });
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Printer Assignment</h1>
        <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
          <Loader2 size={32} className="mx-auto text-gray-300 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Assignment Rules</h1>
        <button
          onClick={startCreate}
          disabled={editingRule !== null}
          className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white hover:bg-amber-600 transition-colors disabled:opacity-50"
        >
          <Plus size={16} />
          Add Rule
        </button>
      </div>

      {/* Rules Table */}
      {rules.length === 0 && !editingRule ? (
        <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
          <ClipboardList size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500">No assignment rules configured</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left px-4 py-3 font-medium text-gray-600">Name</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Technology</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Material</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Printers</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">Priority</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">Active</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rules.map((rule) => (
                <tr key={rule.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{rule.name}</td>
                  <td className="px-4 py-3 text-gray-600 uppercase">
                    {rule.conditions.technology ?? "any"}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {rule.conditions.materialCategory ?? "any"}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {rule.preferredPrinterIds.length > 0
                      ? rule.preferredPrinterIds
                          .map((id) => printers.find((p) => p.id === id)?.name ?? id.slice(0, 8))
                          .join(", ")
                      : "Any"}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-100 text-amber-700 text-xs font-bold">
                      {rule.priority}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`inline-block w-2 h-2 rounded-full ${
                        rule.enabled ? "bg-green-500" : "bg-gray-300"
                      }`}
                    />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => startEdit(rule)}
                        disabled={editingRule !== null}
                        className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-700 disabled:opacity-50"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(rule.id)}
                        disabled={isPending}
                        className="p-1.5 rounded hover:bg-red-50 text-gray-500 hover:text-red-600 disabled:opacity-50"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Inline Edit/Create Form */}
      {editingRule && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">
              {isCreating ? "New Assignment Rule" : "Edit Rule"}
            </h3>
            <button onClick={cancelEdit} className="p-1 rounded hover:bg-amber-100 text-gray-500">
              <X size={18} />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input
                type="text"
                value={editingRule.name ?? ""}
                onChange={(e) => setEditingRule({ ...editingRule, name: e.target.value })}
                placeholder="e.g. Large FDM Parts"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none bg-white"
              />
            </div>

            {/* Priority */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Priority (1-10)</label>
              <input
                type="number"
                min={1}
                max={10}
                value={editingRule.priority ?? 5}
                onChange={(e) =>
                  setEditingRule({ ...editingRule, priority: parseInt(e.target.value) || 5 })
                }
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none bg-white"
              />
            </div>

            {/* Technology Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Technology Filter</label>
              <select
                value={editingRule.conditions?.technology ?? "any"}
                onChange={(e) =>
                  setEditingRule({
                    ...editingRule,
                    conditions: { ...editingRule.conditions, technology: e.target.value },
                  })
                }
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none bg-white"
              >
                {TECHNOLOGIES.map((t) => (
                  <option key={t} value={t}>
                    {t === "any" ? "Any" : t.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>

            {/* Material Category */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Material Category</label>
              <select
                value={editingRule.conditions?.materialCategory ?? "any"}
                onChange={(e) =>
                  setEditingRule({
                    ...editingRule,
                    conditions: { ...editingRule.conditions, materialCategory: e.target.value },
                  })
                }
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none bg-white"
              >
                {MATERIAL_CATEGORIES.map((m) => (
                  <option key={m} value={m}>
                    {m === "any" ? "Any" : m}
                  </option>
                ))}
              </select>
            </div>

            {/* Min Build Volume */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Min Build Volume (cm3)
              </label>
              <input
                type="number"
                min={0}
                value={editingRule.conditions?.minBuildVolume ?? ""}
                onChange={(e) =>
                  setEditingRule({
                    ...editingRule,
                    conditions: {
                      ...editingRule.conditions,
                      minBuildVolume: e.target.value ? parseFloat(e.target.value) : undefined,
                    },
                  })
                }
                placeholder="Optional"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none bg-white"
              />
            </div>

            {/* Active Toggle */}
            <div className="flex items-center gap-3 pt-6">
              <button
                type="button"
                onClick={() => setEditingRule({ ...editingRule, enabled: !editingRule.enabled })}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                  editingRule.enabled ? "bg-amber-500" : "bg-gray-200"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    editingRule.enabled ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
              <span className="text-sm text-gray-700">Active</span>
            </div>
          </div>

          {/* Preferred Printers */}
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Preferred Printers
            </label>
            {printers.length === 0 ? (
              <p className="text-xs text-gray-500">No printers available</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {printers.map((printer) => {
                  const selected = editingRule.preferredPrinterIds?.includes(printer.id) ?? false;
                  return (
                    <button
                      key={printer.id}
                      onClick={() => togglePrinter(printer.id)}
                      className={`inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium border transition-colors ${
                        selected
                          ? "bg-amber-100 border-amber-300 text-amber-800"
                          : "bg-white border-gray-200 text-gray-600 hover:border-gray-300"
                      }`}
                    >
                      {selected && <Check size={12} />}
                      {printer.name}
                      <span className="text-gray-400 uppercase">({printer.technology})</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Save / Cancel */}
          <div className="flex justify-end gap-2 mt-6">
            <button
              onClick={cancelEdit}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isPending || !editingRule.name}
              className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white hover:bg-amber-600 transition-colors disabled:opacity-50"
            >
              {isPending && <Loader2 size={14} className="animate-spin" />}
              {isCreating ? "Create Rule" : "Save Changes"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
