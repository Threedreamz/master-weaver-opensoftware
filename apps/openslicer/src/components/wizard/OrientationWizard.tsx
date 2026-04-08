"use client";

import { useState, useCallback } from "react";
import { RotateCw, Check, Loader2, Star } from "lucide-react";

export interface OrientationOption {
  rotationX: number;
  rotationY: number;
  rotationZ: number;
  supportVolumeCm3: number;
  printTimeEstimate: number;
  surfaceQualityScore: number;
  unsupportedFaceCount: number;
  cosmeticFacePenalty: number;
}

interface OrientationWizardProps {
  modelId: string;
  onApply: (orientation: OrientationOption) => void;
  onClose?: () => void;
}

export function OrientationWizard({
  modelId,
  onApply,
  onClose,
}: OrientationWizardProps) {
  const [orientations, setOrientations] = useState<OrientationOption[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fetched, setFetched] = useState(false);

  const fetchOrientations = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/models/${modelId}/orient`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ maxCandidates: 5 }),
      });
      if (!res.ok) throw new Error(`Failed to compute orientations: ${res.status}`);
      const data = await res.json();
      setOrientations(data.orientations ?? data);
      setFetched(true);
      setSelectedIndex(0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [modelId]);

  const handleApply = () => {
    if (selectedIndex !== null && orientations[selectedIndex]) {
      onApply(orientations[selectedIndex]);
    }
  };

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  };

  return (
    <div className="rounded-lg border border-zinc-700 bg-zinc-900 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-zinc-100">
          <RotateCw className="h-4 w-4 text-amber-400" />
          Orientation Wizard
        </h3>
        {onClose && (
          <button
            onClick={onClose}
            className="text-xs text-zinc-400 hover:text-zinc-200"
          >
            Close
          </button>
        )}
      </div>

      {!fetched && !loading && (
        <button
          onClick={fetchOrientations}
          className="w-full rounded bg-amber-600 px-3 py-2 text-sm font-medium text-white hover:bg-amber-500 transition-colors"
        >
          Find Optimal Orientations
        </button>
      )}

      {loading && (
        <div className="flex items-center justify-center gap-2 py-6 text-zinc-400">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm">Computing orientations...</span>
        </div>
      )}

      {error && (
        <div className="rounded bg-red-900/30 border border-red-800 p-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {fetched && orientations.length > 0 && (
        <>
          <div className="grid grid-cols-1 gap-2">
            {orientations.map((o, i) => (
              <button
                key={i}
                onClick={() => setSelectedIndex(i)}
                className={`flex items-start gap-3 rounded-md border p-3 text-left transition-colors ${
                  selectedIndex === i
                    ? "border-amber-500 bg-amber-500/10"
                    : "border-zinc-700 bg-zinc-800 hover:border-zinc-600"
                }`}
              >
                {/* Thumbnail placeholder */}
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded bg-zinc-700 text-xs text-zinc-400">
                  {i === 0 && <Star className="h-4 w-4 text-amber-400" />}
                  {i !== 0 && `#${i + 1}`}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-zinc-100">
                      Option {i + 1}
                    </span>
                    {i === 0 && (
                      <span className="rounded bg-amber-600/20 px-1.5 py-0.5 text-[10px] font-medium text-amber-400">
                        BEST
                      </span>
                    )}
                  </div>

                  <div className="mt-1 grid grid-cols-2 gap-x-4 gap-y-0.5 text-xs text-zinc-400">
                    <span>
                      Rotation: {o.rotationX.toFixed(1)}° / {o.rotationY.toFixed(1)}° / {o.rotationZ.toFixed(1)}°
                    </span>
                    <span>
                      Support: {o.supportVolumeCm3.toFixed(2)} cm³
                    </span>
                    <span>
                      Quality: {o.surfaceQualityScore}/100
                    </span>
                    <span>
                      Time: ~{formatTime(o.printTimeEstimate)}
                    </span>
                  </div>
                </div>

                {selectedIndex === i && (
                  <Check className="h-4 w-4 shrink-0 text-amber-400" />
                )}
              </button>
            ))}
          </div>

          <div className="mt-3 flex gap-2">
            <button
              onClick={handleApply}
              disabled={selectedIndex === null}
              className="flex-1 rounded bg-amber-600 px-3 py-2 text-sm font-medium text-white hover:bg-amber-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Apply Orientation
            </button>
            <button
              onClick={fetchOrientations}
              className="rounded border border-zinc-600 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800 transition-colors"
            >
              Recalculate
            </button>
          </div>
        </>
      )}

      {fetched && orientations.length === 0 && !error && (
        <p className="py-4 text-center text-sm text-zinc-500">
          No orientations found for this model.
        </p>
      )}
    </div>
  );
}
