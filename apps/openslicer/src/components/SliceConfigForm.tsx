"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Loader2, Download, CheckCircle, AlertCircle } from "lucide-react";

interface SliceConfig {
  layerHeight: number;
  infillPercent: number;
  infillPattern: string;
  supportsEnabled: boolean;
  printSpeed: number;
  nozzleTemp: number;
  bedTemp: number;
  arcOverhangEnabled: boolean;
}

interface SliceResult {
  historyId: string;
  gcodeId: string;
  metadata: {
    estimatedTime: number;
    estimatedMaterial: number;
    layerCount: number;
    filamentLengthM: number;
    estimatedCost: number | null;
    slicerName: string;
  };
  engine: string;
  fallback: boolean;
}

interface SliceConfigFormProps {
  modelId?: string | null;
  profileId?: string | null;
}

const INFILL_PATTERNS = [
  "grid",
  "lines",
  "triangles",
  "tri-hexagon",
  "cubic",
  "gyroid",
  "honeycomb",
  "lightning",
];

export function SliceConfigForm({ modelId, profileId }: SliceConfigFormProps) {
  const t = useTranslations("slice");
  const [config, setConfig] = useState<SliceConfig>({
    layerHeight: 0.2,
    infillPercent: 20,
    infillPattern: "grid",
    supportsEnabled: false,
    printSpeed: 60,
    nozzleTemp: 210,
    bedTemp: 60,
    arcOverhangEnabled: false,
  });

  const [isSlicing, setIsSlicing] = useState(false);
  const [sliceResult, setSliceResult] = useState<SliceResult | null>(null);
  const [sliceError, setSliceError] = useState<string | null>(null);
  const [gcodePreview, setGcodePreview] = useState<string | null>(null);

  function update<K extends keyof SliceConfig>(key: K, value: SliceConfig[K]) {
    setConfig((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSlice() {
    if (!modelId) {
      setSliceError("Please upload a model first");
      return;
    }

    setIsSlicing(true);
    setSliceError(null);
    setSliceResult(null);
    setGcodePreview(null);

    try {
      const res = await fetch("/api/slice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          modelId,
          profileId: profileId || "default",
          engine: "internal",
          arcOverhangEnabled: config.arcOverhangEnabled,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Slicing failed" }));
        throw new Error(err.error || err.details || `Slicing failed (${res.status})`);
      }

      const result: SliceResult = await res.json();
      setSliceResult(result);

      // Fetch G-code content for preview
      try {
        const gcodeRes = await fetch(`/api/slice/history?historyId=${result.historyId}`);
        if (gcodeRes.ok) {
          const gcodeData = await gcodeRes.json();
          if (gcodeData.gcodePath) {
            // Read the first 5000 chars of gcode for preview
            const fileRes = await fetch(`/api/slice/history?historyId=${result.historyId}&content=true`);
            if (fileRes.ok) {
              const content = await fileRes.json();
              setGcodePreview(content.gcode || null);
            }
          }
        }
      } catch {
        // G-code preview is optional
      }
    } catch (err) {
      setSliceError(err instanceof Error ? err.message : "Slicing failed");
    } finally {
      setIsSlicing(false);
    }
  }

  function formatTime(seconds: number): string {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${Math.round(seconds % 60)}s`;
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${h}h ${m}m`;
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Layer Height */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t("layerHeight")}</label>
          <select
            value={config.layerHeight}
            onChange={(e) => update("layerHeight", parseFloat(e.target.value))}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
          >
            <option value={0.08}>0.08 mm ({t("ultraFine")})</option>
            <option value={0.1}>0.10 mm ({t("fine")})</option>
            <option value={0.16}>0.16 mm ({t("optimal")})</option>
            <option value={0.2}>0.20 mm ({t("standard")})</option>
            <option value={0.28}>0.28 mm ({t("draft")})</option>
          </select>
        </div>

        {/* Infill Percent */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t("infillPercent")} — {config.infillPercent}%
          </label>
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={config.infillPercent}
            onChange={(e) => update("infillPercent", parseInt(e.target.value, 10))}
            className="w-full accent-blue-500"
          />
        </div>

        {/* Infill Pattern */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t("infillPattern")}</label>
          <select
            value={config.infillPattern}
            onChange={(e) => update("infillPattern", e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
          >
            {INFILL_PATTERNS.map((pattern) => (
              <option key={pattern} value={pattern}>
                {pattern.charAt(0).toUpperCase() + pattern.slice(1).replace("-", " ")}
              </option>
            ))}
          </select>
        </div>

        {/* Print Speed */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t("printSpeed")}</label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={10}
              max={300}
              value={config.printSpeed}
              onChange={(e) => update("printSpeed", parseInt(e.target.value, 10))}
              className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
            />
            <span className="text-sm text-gray-500">mm/s</span>
          </div>
        </div>

        {/* Nozzle Temp */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t("nozzleTemp")}</label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={170}
              max={300}
              value={config.nozzleTemp}
              onChange={(e) => update("nozzleTemp", parseInt(e.target.value, 10))}
              className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
            />
            <span className="text-sm text-gray-500">°C</span>
          </div>
        </div>

        {/* Bed Temp */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t("bedTemp")}</label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={0}
              max={120}
              value={config.bedTemp}
              onChange={(e) => update("bedTemp", parseInt(e.target.value, 10))}
              className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
            />
            <span className="text-sm text-gray-500">°C</span>
          </div>
        </div>
      </div>

      {/* Supports Toggle */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          role="switch"
          aria-checked={config.supportsEnabled}
          onClick={() => update("supportsEnabled", !config.supportsEnabled)}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            config.supportsEnabled ? "bg-blue-500" : "bg-gray-300"
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              config.supportsEnabled ? "translate-x-6" : "translate-x-1"
            }`}
          />
        </button>
        <span className="text-sm font-medium text-gray-700">{t("enableSupports")}</span>
      </div>

      {/* Arc Overhangs Toggle */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          role="switch"
          aria-checked={config.arcOverhangEnabled}
          onClick={() => update("arcOverhangEnabled", !config.arcOverhangEnabled)}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            config.arcOverhangEnabled ? "bg-orange-500" : "bg-gray-300"
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              config.arcOverhangEnabled ? "translate-x-6" : "translate-x-1"
            }`}
          />
        </button>
        <div>
          <span className="text-sm font-medium text-gray-700">Arc Overhangs</span>
          <p className="text-xs text-gray-400">
            Use G2/G3 arc moves on overhang surfaces for smoother dome/bridge quality
          </p>
        </div>
      </div>

      {/* Slice Button */}
      <div className="pt-2">
        <button
          type="button"
          onClick={handleSlice}
          disabled={isSlicing || !modelId}
          className={`px-6 py-2.5 rounded-lg font-medium transition-colors flex items-center gap-2 ${
            isSlicing || !modelId
              ? "bg-gray-300 text-gray-500 cursor-not-allowed"
              : "bg-blue-500 text-white hover:bg-blue-600"
          }`}
        >
          {isSlicing ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Slicing...
            </>
          ) : (
            t("sliceButton")
          )}
        </button>
        {!modelId && (
          <p className="text-xs text-gray-400 mt-1">Upload a model first to enable slicing</p>
        )}
      </div>

      {/* Slice Error */}
      {sliceError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 flex items-start gap-3">
          <AlertCircle size={18} className="text-red-500 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-red-800">Slicing failed</p>
            <p className="text-xs text-red-600 mt-1">{sliceError}</p>
          </div>
        </div>
      )}

      {/* Slice Result */}
      {sliceResult && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <CheckCircle size={18} className="text-green-600" />
            <span className="text-sm font-medium text-green-800">Slicing complete</span>
            <span className="text-xs text-green-600">({sliceResult.metadata.slicerName})</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <div>
              <span className="text-gray-500 text-xs">Layers</span>
              <p className="font-medium text-gray-900">{sliceResult.metadata.layerCount}</p>
            </div>
            <div>
              <span className="text-gray-500 text-xs">Time</span>
              <p className="font-medium text-gray-900">{formatTime(sliceResult.metadata.estimatedTime)}</p>
            </div>
            <div>
              <span className="text-gray-500 text-xs">Material</span>
              <p className="font-medium text-gray-900">{sliceResult.metadata.estimatedMaterial.toFixed(1)}g</p>
            </div>
            <div>
              <span className="text-gray-500 text-xs">Filament</span>
              <p className="font-medium text-gray-900">{sliceResult.metadata.filamentLengthM.toFixed(2)}m</p>
            </div>
          </div>
          {config.arcOverhangEnabled && (
            <div className="rounded-md bg-orange-50 border border-orange-200 p-3">
              <p className="text-xs font-medium text-orange-700">Arc Overhangs enabled</p>
              <p className="text-xs text-orange-600 mt-0.5">
                G2/G3 arc moves were generated for overhang zones. Check the G-code preview below.
              </p>
            </div>
          )}
          <button
            type="button"
            onClick={() => {
              window.open(`/api/slice/history?historyId=${sliceResult.historyId}&download=true`, "_blank");
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <Download size={14} />
            Download G-code
          </button>
        </div>
      )}
    </div>
  );
}
