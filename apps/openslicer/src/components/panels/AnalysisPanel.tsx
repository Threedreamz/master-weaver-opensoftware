"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Box,
  Triangle,
  Layers,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronRight,
  RefreshCw,
} from "lucide-react";
import { useSlicerStore } from "../../stores/slicer-store";

interface MeshAnalysis {
  dimensions: { width: number; depth: number; height: number };
  volume: number;
  surfaceArea: number;
  triangleCount: number;
  vertexCount: number;
  isManifold: boolean;
  feasibility: {
    fdm: "green" | "yellow" | "red";
    sla: "green" | "yellow" | "red";
    sls: "green" | "yellow" | "red";
  };
}

const FEASIBILITY_COLORS = {
  green: "bg-green-500/20 text-green-400 border-green-500/30",
  yellow: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  red: "bg-red-500/20 text-red-400 border-red-500/30",
} as const;

const FEASIBILITY_LABELS = {
  green: "OK",
  yellow: "Issues",
  red: "No",
} as const;

export function AnalysisPanel() {
  const { selectedModelId } = useSlicerStore();
  const [analysis, setAnalysis] = useState<MeshAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [meshInfoOpen, setMeshInfoOpen] = useState(true);
  const [feasibilityOpen, setFeasibilityOpen] = useState(true);

  const fetchAnalysis = useCallback(async () => {
    if (!selectedModelId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/models/${selectedModelId}/analyze`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Analysis failed");
      const data = await res.json();
      setAnalysis(data);
    } catch (err) {
      console.error("Analysis error:", err);
    } finally {
      setLoading(false);
    }
  }, [selectedModelId]);

  useEffect(() => {
    if (selectedModelId) {
      fetchAnalysis();
    } else {
      setAnalysis(null);
    }
  }, [selectedModelId, fetchAnalysis]);

  if (!selectedModelId) {
    return (
      <div className="p-3 text-xs text-zinc-500 text-center">
        Select a model to view analysis
      </div>
    );
  }

  if (loading && !analysis) {
    return (
      <div className="p-3 text-xs text-zinc-400 text-center">
        Analyzing mesh...
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="p-3 text-xs text-zinc-500 text-center">
        No analysis data
      </div>
    );
  }

  const { dimensions, volume, surfaceArea, triangleCount, vertexCount, isManifold, feasibility } =
    analysis;

  return (
    <div className="flex flex-col gap-1 p-3">
      {/* Mesh Info Section */}
      <button
        type="button"
        onClick={() => setMeshInfoOpen(!meshInfoOpen)}
        className="flex items-center gap-1.5 text-xs font-semibold text-zinc-300 py-1 hover:text-white transition-colors"
      >
        {meshInfoOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        Mesh Info
      </button>

      {meshInfoOpen && (
        <div className="flex flex-col gap-1.5 pl-1 mb-2">
          {/* Dimensions */}
          <div className="flex items-center gap-2 text-xs">
            <Box size={12} className="text-zinc-500 shrink-0" />
            <span className="text-zinc-400">Dimensions</span>
            <span className="text-zinc-200 ml-auto font-mono text-[11px]">
              {dimensions.width.toFixed(1)} x {dimensions.depth.toFixed(1)} x{" "}
              {dimensions.height.toFixed(1)} mm
            </span>
          </div>

          {/* Volume */}
          <div className="flex items-center gap-2 text-xs">
            <Layers size={12} className="text-zinc-500 shrink-0" />
            <span className="text-zinc-400">Volume</span>
            <span className="text-zinc-200 ml-auto font-mono text-[11px]">
              {volume.toFixed(2)} cm³
            </span>
          </div>

          {/* Surface Area */}
          <div className="flex items-center gap-2 text-xs">
            <Layers size={12} className="text-zinc-500 shrink-0" />
            <span className="text-zinc-400">Surface Area</span>
            <span className="text-zinc-200 ml-auto font-mono text-[11px]">
              {surfaceArea.toFixed(2)} cm²
            </span>
          </div>

          {/* Triangle Count */}
          <div className="flex items-center gap-2 text-xs">
            <Triangle size={12} className="text-zinc-500 shrink-0" />
            <span className="text-zinc-400">Triangles</span>
            <span className="text-zinc-200 ml-auto font-mono text-[11px]">
              {triangleCount.toLocaleString()}
            </span>
          </div>

          {/* Vertex Count */}
          <div className="flex items-center gap-2 text-xs">
            <Triangle size={12} className="text-zinc-500 shrink-0" />
            <span className="text-zinc-400">Vertices</span>
            <span className="text-zinc-200 ml-auto font-mono text-[11px]">
              {vertexCount.toLocaleString()}
            </span>
          </div>

          {/* Manifold */}
          <div className="flex items-center gap-2 text-xs">
            {isManifold ? (
              <CheckCircle2 size={12} className="text-green-400 shrink-0" />
            ) : (
              <XCircle size={12} className="text-red-400 shrink-0" />
            )}
            <span className="text-zinc-400">Manifold</span>
            <span
              className={`ml-auto text-[10px] font-medium px-1.5 py-0.5 rounded ${
                isManifold
                  ? "bg-green-500/20 text-green-400"
                  : "bg-red-500/20 text-red-400"
              }`}
            >
              {isManifold ? "Yes" : "No"}
            </span>
          </div>
        </div>
      )}

      {/* Feasibility Section */}
      <button
        type="button"
        onClick={() => setFeasibilityOpen(!feasibilityOpen)}
        className="flex items-center gap-1.5 text-xs font-semibold text-zinc-300 py-1 hover:text-white transition-colors"
      >
        {feasibilityOpen ? (
          <ChevronDown size={12} />
        ) : (
          <ChevronRight size={12} />
        )}
        Feasibility
      </button>

      {feasibilityOpen && (
        <div className="flex gap-2 pl-1 mb-2">
          {(["fdm", "sla", "sls"] as const).map((tech) => (
            <div
              key={tech}
              className={`flex-1 text-center rounded border px-2 py-1.5 ${FEASIBILITY_COLORS[feasibility[tech]]}`}
            >
              <div className="text-[10px] font-semibold uppercase">{tech}</div>
              <div className="text-[10px] mt-0.5">
                {FEASIBILITY_LABELS[feasibility[tech]]}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Re-analyze button */}
      <button
        type="button"
        onClick={fetchAnalysis}
        disabled={loading}
        className="flex items-center justify-center gap-1.5 mt-1 px-3 py-1.5 rounded-md bg-zinc-800 border border-zinc-700 text-xs text-zinc-300 hover:bg-zinc-700 hover:text-white transition-colors disabled:opacity-50"
      >
        <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
        Re-analyze
      </button>
    </div>
  );
}
