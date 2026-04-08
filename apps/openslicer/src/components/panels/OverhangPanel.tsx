"use client";

import { useState, useCallback } from "react";
import {
  Layers,
  Eye,
  EyeOff,
  Activity,
  ChevronDown,
  ChevronRight,
  RefreshCw,
} from "lucide-react";
import { useSlicerStore } from "../../stores/slicer-store";
import type { ArcOverhangResult, OverhangZone } from "@opensoftware/slicer-core";

const SEVERITY_BADGE: Record<string, string> = {
  mild: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  moderate: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  severe: "bg-red-500/20 text-red-400 border-red-500/30",
  extreme: "bg-purple-500/20 text-purple-400 border-purple-500/30",
};

function ZoneDetail({ zone }: { zone: OverhangZone }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded border border-zinc-700 bg-zinc-800/50">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-1.5 px-2 py-1.5 text-xs text-zinc-300 hover:text-white transition-colors"
      >
        {open ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
        <span
          className={`inline-block rounded border px-1.5 py-0.5 text-[10px] font-medium ${SEVERITY_BADGE[zone.severity]}`}
        >
          {zone.severity}
        </span>
        <span className="ml-auto font-mono text-[10px] text-zinc-500">
          {zone.faces.length} faces
        </span>
      </button>
      {open && (
        <div className="border-t border-zinc-700 px-2 py-1.5 text-[11px] text-zinc-400 space-y-0.5">
          <p>Area: {zone.totalArea.toFixed(1)} mm2</p>
          <p>Avg angle: {zone.averageAngle.toFixed(1)} deg</p>
          <p>
            Speed: {(zone.recommendations.speedMultiplier * 100).toFixed(0)}% |
            Flow: {(zone.recommendations.flowMultiplier * 100).toFixed(0)}% |
            Cooling: {zone.recommendations.coolingMultiplier.toFixed(1)}x
          </p>
          {zone.recommendations.arcEnabled && (
            <p>
              Arc: r={zone.recommendations.arcRadius}mm,{" "}
              {zone.recommendations.arcSegments} segments
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export function OverhangPanel() {
  const {
    selectedModelId,
    overhangResult,
    showOverhangOverlay,
    showArcPaths,
    setOverhangResult,
    toggleOverhangOverlay,
    toggleArcPaths,
  } = useSlicerStore();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [zonesOpen, setZonesOpen] = useState(false);

  const runAnalysis = useCallback(async () => {
    if (!selectedModelId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/models/${selectedModelId}/overhangs`, {
        method: "POST",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Analysis failed");
      }
      const data: ArcOverhangResult = await res.json();
      setOverhangResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      setOverhangResult(null);
    } finally {
      setLoading(false);
    }
  }, [selectedModelId, setOverhangResult]);

  if (!selectedModelId) {
    return (
      <div className="p-3 text-xs text-zinc-500 text-center">
        Select a model to analyze overhangs
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 p-3">
      {/* Analyze button */}
      <button
        type="button"
        onClick={runAnalysis}
        disabled={loading}
        className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-md bg-indigo-600 text-sm font-semibold text-white hover:bg-indigo-500 transition-colors disabled:opacity-50"
      >
        {loading ? (
          <RefreshCw size={14} className="animate-spin" />
        ) : (
          <Activity size={14} />
        )}
        {loading ? "Analyzing..." : "Analyze Overhangs"}
      </button>

      {error && (
        <p className="text-xs text-red-400 text-center">{error}</p>
      )}

      {overhangResult && (
        <>
          {/* Summary stats */}
          <div className="rounded-md bg-zinc-800/50 border border-zinc-700 p-2 space-y-1.5">
            <div className="flex items-center gap-2 text-xs">
              <Layers size={12} className="text-zinc-500 shrink-0" />
              <span className="text-zinc-400">Total faces</span>
              <span className="text-zinc-200 ml-auto font-mono text-[11px]">
                {overhangResult.totalFaces.toLocaleString()}
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <Activity size={12} className="text-zinc-500 shrink-0" />
              <span className="text-zinc-400">Overhang</span>
              <span className="text-zinc-200 ml-auto font-mono text-[11px]">
                {overhangResult.overhangPercentage.toFixed(1)}%
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <Layers size={12} className="text-zinc-500 shrink-0" />
              <span className="text-zinc-400">Zones</span>
              <span className="text-zinc-200 ml-auto font-mono text-[11px]">
                {overhangResult.zones.length}
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <Activity size={12} className="text-zinc-500 shrink-0" />
              <span className="text-zinc-400">Quality gain</span>
              <span className="text-zinc-200 ml-auto font-mono text-[11px]">
                ~{overhangResult.summary.estimatedQualityGain}%
              </span>
            </div>
          </div>

          {/* Severity breakdown */}
          <div className="flex flex-wrap gap-1.5">
            {overhangResult.summary.mildCount > 0 && (
              <span className={`inline-block rounded border px-1.5 py-0.5 text-[10px] font-medium ${SEVERITY_BADGE.mild}`}>
                mild: {overhangResult.summary.mildCount}
              </span>
            )}
            {overhangResult.summary.moderateCount > 0 && (
              <span className={`inline-block rounded border px-1.5 py-0.5 text-[10px] font-medium ${SEVERITY_BADGE.moderate}`}>
                moderate: {overhangResult.summary.moderateCount}
              </span>
            )}
            {overhangResult.summary.severeCount > 0 && (
              <span className={`inline-block rounded border px-1.5 py-0.5 text-[10px] font-medium ${SEVERITY_BADGE.severe}`}>
                severe: {overhangResult.summary.severeCount}
              </span>
            )}
            {overhangResult.summary.extremeCount > 0 && (
              <span className={`inline-block rounded border px-1.5 py-0.5 text-[10px] font-medium ${SEVERITY_BADGE.extreme}`}>
                extreme: {overhangResult.summary.extremeCount}
              </span>
            )}
          </div>

          {/* Toggles */}
          <div className="flex flex-col gap-1">
            <button
              type="button"
              onClick={toggleOverhangOverlay}
              className={`flex items-center gap-2 rounded px-2 py-1.5 text-xs transition-colors ${
                showOverhangOverlay
                  ? "bg-indigo-600/20 text-indigo-300 border border-indigo-500/30"
                  : "bg-zinc-800 text-zinc-400 border border-zinc-700 hover:text-zinc-200"
              }`}
            >
              {showOverhangOverlay ? <Eye size={12} /> : <EyeOff size={12} />}
              Show Overlay
            </button>
            <button
              type="button"
              onClick={toggleArcPaths}
              className={`flex items-center gap-2 rounded px-2 py-1.5 text-xs transition-colors ${
                showArcPaths
                  ? "bg-cyan-600/20 text-cyan-300 border border-cyan-500/30"
                  : "bg-zinc-800 text-zinc-400 border border-zinc-700 hover:text-zinc-200"
              }`}
            >
              {showArcPaths ? <Eye size={12} /> : <EyeOff size={12} />}
              Show Arc Paths
            </button>
          </div>

          {/* Zone list */}
          {overhangResult.zones.length > 0 && (
            <>
              <button
                type="button"
                onClick={() => setZonesOpen(!zonesOpen)}
                className="flex items-center gap-1.5 text-xs font-semibold text-zinc-300 py-1 hover:text-white transition-colors"
              >
                {zonesOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                Zones ({overhangResult.zones.length})
              </button>
              {zonesOpen && (
                <div className="flex flex-col gap-1 max-h-48 overflow-y-auto">
                  {overhangResult.zones.map((zone) => (
                    <ZoneDetail key={zone.id} zone={zone} />
                  ))}
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
