"use client";

import { useState, useCallback } from "react";
import { Package, Plus, Loader2, AlertTriangle, CheckCircle } from "lucide-react";
import { useSlicerStore } from "../../stores/slicer-store";

export interface PackingResultData {
  packed: Array<{
    id: string;
    instanceIndex: number;
    position: { x: number; y: number; z: number };
    dimensions: { width: number; depth: number; height: number };
  }>;
  unpacked: string[];
  utilizationPercent: number;
  totalPackedVolume: number;
  buildVolume: number;
  layerCount: number;
}

interface PackingItemEntry {
  modelId: string;
  modelName: string;
  quantity: number;
}

interface PackingControlsProps {
  buildVolume: { x: number; y: number; z: number };
  onPackResult: (result: PackingResultData) => void;
}

export function PackingControls({
  buildVolume,
  onPackResult,
}: PackingControlsProps) {
  const models = useSlicerStore((s) => s.models);
  const [items, setItems] = useState<PackingItemEntry[]>([]);
  const [gap, setGap] = useState(3);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PackingResultData | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);

  const addModel = useCallback(
    (modelId: string) => {
      const model = models.find((m) => m.id === modelId);
      if (!model) return;

      const existing = items.find((it) => it.modelId === modelId);
      if (existing) {
        setItems(
          items.map((it) =>
            it.modelId === modelId
              ? { ...it, quantity: it.quantity + 1 }
              : it
          )
        );
      } else {
        setItems([
          ...items,
          { modelId, modelName: model.name, quantity: 1 },
        ]);
      }
      setShowDropdown(false);
    },
    [items, models]
  );

  const updateQuantity = (modelId: string, quantity: number) => {
    if (quantity <= 0) {
      setItems(items.filter((it) => it.modelId !== modelId));
    } else {
      setItems(
        items.map((it) =>
          it.modelId === modelId ? { ...it, quantity } : it
        )
      );
    }
  };

  const handlePack = async () => {
    if (items.length === 0) return;

    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/packing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((it) => ({
            modelId: it.modelId,
            quantity: it.quantity,
          })),
          buildVolume,
          gap,
        }),
      });

      if (!res.ok) throw new Error(`Packing failed: ${res.status}`);
      const data: PackingResultData = await res.json();
      setResult(data);
      onPackResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  const availableModels = models.filter(
    (m) => !items.some((it) => it.modelId === m.id)
  );

  return (
    <div className="rounded-lg border border-zinc-700 bg-zinc-900 p-4">
      <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-zinc-100">
        <Package className="h-4 w-4 text-blue-400" />
        SLS Packing
      </h3>

      {/* Item list */}
      <div className="space-y-2">
        {items.map((item) => (
          <div
            key={item.modelId}
            className="flex items-center gap-2 rounded border border-zinc-700 bg-zinc-800 px-3 py-2"
          >
            <span className="flex-1 truncate text-sm text-zinc-200">
              {item.modelName}
            </span>
            <label className="flex items-center gap-1 text-xs text-zinc-400">
              Qty:
              <input
                type="number"
                min={0}
                max={100}
                value={item.quantity}
                onChange={(e) =>
                  updateQuantity(item.modelId, parseInt(e.target.value) || 0)
                }
                className="w-14 rounded border border-zinc-600 bg-zinc-900 px-2 py-1 text-xs text-zinc-100 focus:border-blue-500 focus:outline-none"
              />
            </label>
          </div>
        ))}
      </div>

      {/* Add model dropdown */}
      <div className="relative mt-2">
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          disabled={availableModels.length === 0}
          className="flex w-full items-center justify-center gap-1 rounded border border-dashed border-zinc-600 px-3 py-2 text-sm text-zinc-400 hover:border-zinc-500 hover:text-zinc-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
          Add Model
        </button>
        {showDropdown && availableModels.length > 0 && (
          <div className="absolute left-0 right-0 top-full z-10 mt-1 rounded border border-zinc-600 bg-zinc-800 shadow-lg">
            {availableModels.map((m) => (
              <button
                key={m.id}
                onClick={() => addModel(m.id)}
                className="block w-full px-3 py-2 text-left text-sm text-zinc-200 hover:bg-zinc-700"
              >
                {m.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Gap control */}
      <div className="mt-3 flex items-center gap-2">
        <label className="text-xs text-zinc-400">Gap (mm):</label>
        <input
          type="number"
          min={0}
          max={20}
          step={0.5}
          value={gap}
          onChange={(e) => setGap(parseFloat(e.target.value) || 0)}
          className="w-20 rounded border border-zinc-600 bg-zinc-900 px-2 py-1 text-xs text-zinc-100 focus:border-blue-500 focus:outline-none"
        />
      </div>

      {/* Pack button */}
      <button
        onClick={handlePack}
        disabled={items.length === 0 || loading}
        className="mt-3 flex w-full items-center justify-center gap-2 rounded bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Packing...
          </>
        ) : (
          "Pack"
        )}
      </button>

      {/* Error */}
      {error && (
        <div className="mt-2 rounded bg-red-900/30 border border-red-800 p-2 text-xs text-red-300">
          {error}
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="mt-3 space-y-1.5 rounded border border-zinc-700 bg-zinc-800 p-3">
          <div className="flex items-center gap-2 text-sm font-medium text-zinc-100">
            {result.unpacked.length === 0 ? (
              <CheckCircle className="h-4 w-4 text-green-400" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-amber-400" />
            )}
            Packing Results
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-zinc-400">
            <span>Total Items:</span>
            <span className="text-zinc-200">{result.packed.length}</span>
            <span>Utilization:</span>
            <span className="text-zinc-200">{result.utilizationPercent}%</span>
            <span>Layers:</span>
            <span className="text-zinc-200">{result.layerCount}</span>
          </div>
          {result.unpacked.length > 0 && (
            <p className="text-xs text-amber-400">
              {result.unpacked.length} item(s) did not fit
            </p>
          )}
        </div>
      )}
    </div>
  );
}
