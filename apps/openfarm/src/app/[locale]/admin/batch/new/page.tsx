"use client";

import { useState, useEffect, useTransition, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Trash2,
  Loader2,
  Layers,
  X,
} from "lucide-react";

interface ModelOption {
  id: string;
  name: string;
}

interface ProfileOption {
  id: string;
  name: string;
  technology: string;
}

interface ParameterAxis {
  id: string;
  parameter: string;
  values: string;
}

const PARAMETER_OPTIONS = [
  { value: "layer_height", label: "Layer Height (mm)" },
  { value: "infill_density", label: "Infill Density (%)" },
  { value: "nozzle_temp", label: "Nozzle Temperature (\u00B0C)" },
  { value: "print_speed", label: "Print Speed (mm/s)" },
];

function parseValues(input: string): number[] {
  return input
    .split(",")
    .map((v) => parseFloat(v.trim()))
    .filter((v) => !isNaN(v));
}

function cartesianProduct(axes: { parameter: string; values: number[] }[]): Record<string, number>[] {
  if (axes.length === 0) return [];

  const validAxes = axes.filter((a) => a.values.length > 0);
  if (validAxes.length === 0) return [];

  let result: Record<string, number>[] = [{}];

  for (const axis of validAxes) {
    const newResult: Record<string, number>[] = [];
    for (const existing of result) {
      for (const value of axis.values) {
        newResult.push({ ...existing, [axis.parameter]: value });
      }
    }
    result = newResult;
  }

  return result;
}

export default function BatchNewPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [models, setModels] = useState<ModelOption[]>([]);
  const [profiles, setProfiles] = useState<ProfileOption[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedModelId, setSelectedModelId] = useState("");
  const [selectedProfileId, setSelectedProfileId] = useState("");
  const [batchName, setBatchName] = useState("");
  const [axes, setAxes] = useState<ParameterAxis[]>([]);
  const [nextAxisId, setNextAxisId] = useState(1);

  useEffect(() => {
    async function fetchData() {
      try {
        const [modelsRes, profilesRes] = await Promise.all([
          fetch("/api/openfarm/models"),
          fetch("/api/openfarm/profiles"),
        ]);
        if (modelsRes.ok) setModels(await modelsRes.json());
        if (profilesRes.ok) setProfiles(await profilesRes.json());
      } catch {
        // Silently handle
      }
      setLoading(false);
    }
    fetchData();
  }, []);

  function addAxis() {
    const usedParams = axes.map((a) => a.parameter);
    const available = PARAMETER_OPTIONS.find((p) => !usedParams.includes(p.value));
    if (!available) return;

    setAxes((prev) => [
      ...prev,
      { id: String(nextAxisId), parameter: available.value, values: "" },
    ]);
    setNextAxisId((n) => n + 1);
  }

  function removeAxis(id: string) {
    setAxes((prev) => prev.filter((a) => a.id !== id));
  }

  function updateAxis(id: string, field: "parameter" | "values", value: string) {
    setAxes((prev) => prev.map((a) => (a.id === id ? { ...a, [field]: value } : a)));
  }

  const combinations = useMemo(() => {
    const parsedAxes = axes.map((a) => ({
      parameter: a.parameter,
      values: parseValues(a.values),
    }));
    return cartesianProduct(parsedAxes);
  }, [axes]);

  async function handleCreateBatch() {
    if (!selectedModelId || !batchName || combinations.length === 0) return;

    startTransition(async () => {
      try {
        const parameterMatrix: Record<string, number[]> = {};
        for (const axis of axes) {
          const vals = parseValues(axis.values);
          if (vals.length > 0) {
            parameterMatrix[axis.parameter] = vals;
          }
        }

        const res = await fetch("/api/openfarm/batch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: batchName,
            modelId: selectedModelId,
            profileId: selectedProfileId || undefined,
            parameterMatrix,
            totalJobs: combinations.length,
          }),
        });

        if (res.ok) {
          router.push("../batch");
        }
      } catch {
        // Handle error
      }
    });
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">New Batch Job</h1>
        <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
          <Loader2 size={32} className="mx-auto text-gray-300 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">New Batch Job</h1>
        <button
          onClick={() => router.push("../batch")}
          className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          <X size={16} />
          Cancel
        </button>
      </div>

      {/* Base Configuration */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="font-semibold text-gray-900 mb-4">Base Configuration</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Batch Name</label>
            <input
              type="text"
              value={batchName}
              onChange={(e) => setBatchName(e.target.value)}
              placeholder="e.g. Layer Height Comparison"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Base Model</label>
            <select
              value={selectedModelId}
              onChange={(e) => setSelectedModelId(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none"
            >
              <option value="">Select a model...</option>
              {models.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Base Profile</label>
            <select
              value={selectedProfileId}
              onChange={(e) => setSelectedProfileId(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none"
            >
              <option value="">Select a profile...</option>
              {profiles.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.technology.toUpperCase()})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Parameter Axes */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900">Parameter Matrix</h2>
          <button
            onClick={addAxis}
            disabled={axes.length >= PARAMETER_OPTIONS.length}
            className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <Plus size={14} />
            Add Axis
          </button>
        </div>

        {axes.length === 0 ? (
          <div className="text-center py-8">
            <Layers size={32} className="mx-auto text-gray-300 mb-2" />
            <p className="text-sm text-gray-500">
              Add parameter axes to create a test matrix.
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Each axis defines a parameter and its variation values.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {axes.map((axis) => (
              <div key={axis.id} className="flex items-start gap-3 p-3 rounded-lg bg-gray-50">
                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Parameter</label>
                    <select
                      value={axis.parameter}
                      onChange={(e) => updateAxis(axis.id, "parameter", e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none bg-white"
                    >
                      {PARAMETER_OPTIONS.map((opt) => (
                        <option
                          key={opt.value}
                          value={opt.value}
                          disabled={
                            axes.some((a) => a.id !== axis.id && a.parameter === opt.value)
                          }
                        >
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Values (comma-separated)
                    </label>
                    <input
                      type="text"
                      value={axis.values}
                      onChange={(e) => updateAxis(axis.id, "values", e.target.value)}
                      placeholder={
                        axis.parameter === "layer_height"
                          ? "0.1, 0.2, 0.3"
                          : axis.parameter === "infill_density"
                          ? "15, 20, 30, 50"
                          : axis.parameter === "nozzle_temp"
                          ? "200, 210, 220"
                          : "40, 60, 80"
                      }
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none bg-white"
                    />
                    {axis.values && (
                      <p className="text-xs text-gray-400 mt-1">
                        {parseValues(axis.values).length} value(s)
                      </p>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => removeAxis(axis.id)}
                  className="mt-5 p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Matrix Preview */}
      {combinations.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Matrix Preview</h2>
            <span className="text-sm font-medium text-amber-600">
              {combinations.length} job{combinations.length !== 1 ? "s" : ""} will be created
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left px-4 py-2 font-medium text-gray-600 w-12">#</th>
                  {axes
                    .filter((a) => parseValues(a.values).length > 0)
                    .map((axis) => (
                      <th key={axis.id} className="text-left px-4 py-2 font-medium text-gray-600">
                        {PARAMETER_OPTIONS.find((p) => p.value === axis.parameter)?.label ?? axis.parameter}
                      </th>
                    ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {combinations.slice(0, 50).map((combo, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="px-4 py-2 text-gray-400">{idx + 1}</td>
                    {axes
                      .filter((a) => parseValues(a.values).length > 0)
                      .map((axis) => (
                        <td key={axis.id} className="px-4 py-2 text-gray-900">
                          {combo[axis.parameter] ?? "—"}
                        </td>
                      ))}
                  </tr>
                ))}
                {combinations.length > 50 && (
                  <tr>
                    <td
                      colSpan={axes.filter((a) => parseValues(a.values).length > 0).length + 1}
                      className="px-4 py-2 text-center text-sm text-gray-500"
                    >
                      ... and {combinations.length - 50} more
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create Button */}
      <div className="flex justify-end">
        <button
          onClick={handleCreateBatch}
          disabled={isPending || !selectedModelId || !batchName || combinations.length === 0}
          className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-6 py-2.5 text-sm font-medium text-white hover:bg-amber-600 transition-colors disabled:opacity-50"
        >
          {isPending ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Layers size={16} />
          )}
          {isPending
            ? "Creating..."
            : `Create Batch (${combinations.length} job${combinations.length !== 1 ? "s" : ""})`}
        </button>
      </div>
    </div>
  );
}
