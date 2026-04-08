"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { X, Play, Download, RotateCcw, Code2, SlidersHorizontal, Loader2 } from "lucide-react";

// ---------------------------------------------------------------------------
// Parameter extraction (client-side mirror of slicer-core's extractParameters)
// ---------------------------------------------------------------------------

interface ScadParameter {
  name: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  description?: string;
}

function extractParameters(source: string): ScadParameter[] {
  const params: ScadParameter[] = [];
  const re = /^(\w+)\s*=\s*(-?[\d.]+)\s*;\s*(?:\/\/\s*(.*))?$/;

  for (const line of source.split("\n")) {
    const m = line.trim().match(re);
    if (!m) continue;

    const name = m[1];
    const value = parseFloat(m[2]);
    if (Number.isNaN(value)) continue;

    const param: ScadParameter = { name, value };
    const comment = m[3]?.trim();
    if (comment) {
      const rangeMatch = comment.match(/\[(-?[\d.]+):(-?[\d.]+)(?::(-?[\d.]+))?\]/);
      if (rangeMatch) {
        param.min = parseFloat(rangeMatch[1]);
        param.max = parseFloat(rangeMatch[2]);
        if (rangeMatch[3] !== undefined) param.step = parseFloat(rangeMatch[3]);
        const afterRange = comment.replace(/\[.*?\]/, "").trim();
        if (afterRange) param.description = afterRange;
      } else {
        param.description = comment;
      }
    }
    params.push(param);
  }
  return params;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export interface OpenSCADEditorProps {
  /** Initial .scad source code */
  initialSource: string;
  /** Display name of the file */
  filename: string;
  /** Called after a successful render with the new model data */
  onRenderComplete?: (modelData: Record<string, unknown>) => void;
  /** Close the editor */
  onClose: () => void;
}

type Tab = "source" | "parameters";

export function OpenSCADEditor({
  initialSource,
  filename,
  onRenderComplete,
  onClose,
}: OpenSCADEditorProps) {
  const [source, setSource] = useState(initialSource);
  const [activeTab, setActiveTab] = useState<Tab>("source");
  const [paramOverrides, setParamOverrides] = useState<Record<string, number>>({});
  const [rendering, setRendering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRenderInfo, setLastRenderInfo] = useState<string | null>(null);

  // Extract parameters from the current source
  const parameters = useMemo(() => extractParameters(source), [source]);

  // Initialize overrides from extracted defaults
  useEffect(() => {
    const defaults: Record<string, number> = {};
    for (const p of parameters) {
      if (!(p.name in paramOverrides)) {
        defaults[p.name] = p.value;
      }
    }
    if (Object.keys(defaults).length > 0) {
      setParamOverrides((prev) => ({ ...defaults, ...prev }));
    }
    // Only run when parameter names change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parameters.map((p) => p.name).join(",")]);

  // Close on Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  const handleParamChange = useCallback((name: string, value: number) => {
    setParamOverrides((prev) => ({ ...prev, [name]: value }));
  }, []);

  const handleRender = useCallback(async () => {
    setRendering(true);
    setError(null);
    setLastRenderInfo(null);

    try {
      const res = await fetch("/api/models/render-scad", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scadSource: source,
          parameters: paramOverrides,
          filename,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Render failed");
        return;
      }

      setLastRenderInfo(
        `${data.triangleCount?.toLocaleString() ?? "?"} triangles | ${data.boundingBox ? `${data.boundingBox.x.toFixed(1)} x ${data.boundingBox.y.toFixed(1)} x ${data.boundingBox.z.toFixed(1)} mm` : "?"}`
      );

      onRenderComplete?.(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setRendering(false);
    }
  }, [source, paramOverrides, filename, onRenderComplete]);

  const handleSaveScad = useCallback(() => {
    // Build the source with parameter overrides prepended
    let exportSource = source;
    const overrideLines: string[] = [];
    for (const [name, value] of Object.entries(paramOverrides)) {
      overrideLines.push(`${name} = ${value};`);
    }
    if (overrideLines.length > 0) {
      exportSource = overrideLines.join("\n") + "\n\n" + source;
    }

    const blob = new Blob([exportSource], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename.endsWith(".scad") ? filename : `${filename}.scad`;
    a.click();
    URL.revokeObjectURL(url);
  }, [source, paramOverrides, filename]);

  const handleReset = useCallback(() => {
    setSource(initialSource);
    const defaults: Record<string, number> = {};
    for (const p of extractParameters(initialSource)) {
      defaults[p.name] = p.value;
    }
    setParamOverrides(defaults);
    setError(null);
    setLastRenderInfo(null);
  }, [initialSource]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-[720px] max-h-[90vh] flex flex-col rounded-xl border border-zinc-700 bg-zinc-900 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-700">
          <div>
            <h2 className="text-sm font-semibold text-zinc-100">OpenSCAD Editor</h2>
            <p className="text-[10px] text-zinc-500 mt-0.5">{filename}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-md text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-zinc-700">
          <button
            type="button"
            onClick={() => setActiveTab("source")}
            className={`flex items-center gap-1.5 flex-1 px-4 py-2 text-xs font-medium uppercase tracking-wide transition-colors ${
              activeTab === "source"
                ? "text-green-400 border-b-2 border-green-400 bg-zinc-800/50"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            <Code2 size={12} />
            Source
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("parameters")}
            className={`flex items-center gap-1.5 flex-1 px-4 py-2 text-xs font-medium uppercase tracking-wide transition-colors ${
              activeTab === "parameters"
                ? "text-amber-400 border-b-2 border-amber-400 bg-zinc-800/50"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            <SlidersHorizontal size={12} />
            Parameters
            {parameters.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 text-[9px] rounded-full bg-zinc-800 text-zinc-400">
                {parameters.length}
              </span>
            )}
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto">
          {activeTab === "source" ? (
            <textarea
              value={source}
              onChange={(e) => setSource(e.target.value)}
              spellCheck={false}
              className="w-full min-h-[320px] resize-none bg-zinc-950 text-green-400 font-mono text-xs leading-relaxed p-4 border-none outline-none focus:ring-0 placeholder:text-zinc-700"
              placeholder="// Enter OpenSCAD code..."
            />
          ) : (
            <div className="p-4 space-y-3">
              {parameters.length === 0 ? (
                <p className="text-xs text-zinc-500 italic">
                  No parameters detected. Add lines like:{" "}
                  <code className="text-green-400">width = 10; // [1:100:0.5]</code>
                </p>
              ) : (
                parameters.map((param) => {
                  const currentValue = paramOverrides[param.name] ?? param.value;
                  const hasRange = param.min !== undefined && param.max !== undefined;
                  const step = param.step ?? (hasRange ? (param.max! - param.min!) / 100 : 1);

                  return (
                    <div key={param.name} className="space-y-1">
                      <div className="flex items-baseline justify-between">
                        <label className="text-xs font-mono text-zinc-300">
                          {param.name}
                        </label>
                        <div className="flex items-center gap-2">
                          {param.description && (
                            <span className="text-[9px] text-zinc-600">{param.description}</span>
                          )}
                          <input
                            type="number"
                            value={currentValue}
                            step={step}
                            min={param.min}
                            max={param.max}
                            onChange={(e) =>
                              handleParamChange(param.name, parseFloat(e.target.value) || 0)
                            }
                            className="w-20 px-2 py-1 text-xs font-mono text-right text-green-400 bg-zinc-950 border border-zinc-700 rounded-md outline-none focus:border-green-500 transition-colors"
                          />
                        </div>
                      </div>
                      {hasRange && (
                        <input
                          type="range"
                          min={param.min}
                          max={param.max}
                          step={step}
                          value={currentValue}
                          onChange={(e) =>
                            handleParamChange(param.name, parseFloat(e.target.value))
                          }
                          className="w-full h-1.5 rounded-full appearance-none cursor-pointer bg-zinc-800 accent-green-500"
                        />
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* Render info */}
        {lastRenderInfo && (
          <div className="px-5 py-1.5 text-[10px] text-zinc-500 border-t border-zinc-800 bg-zinc-950/50">
            Last render: {lastRenderInfo}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="px-5 py-2 text-xs text-red-400 bg-red-500/10 border-t border-red-500/20">
            {error}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-zinc-700">
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-zinc-500 hover:text-zinc-300 rounded-md hover:bg-zinc-800 transition-colors"
          >
            <RotateCcw size={12} />
            Reset
          </button>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleSaveScad}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-zinc-400 rounded-md border border-zinc-700 hover:bg-zinc-800 transition-colors"
            >
              <Download size={12} />
              Save .scad
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 text-xs text-zinc-400 rounded-md border border-zinc-700 hover:bg-zinc-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleRender}
              disabled={rendering}
              className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium text-white rounded-md bg-green-600 hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {rendering ? <Loader2 size={12} className="animate-spin" /> : <Play size={12} />}
              {rendering ? "Rendering..." : "Render"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
