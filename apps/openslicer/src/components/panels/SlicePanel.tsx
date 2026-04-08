"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Download,
  Upload,
  Clock,
  Droplets,
  CheckCircle2,
  XCircle,
  Printer,
  Palette,
  SlidersHorizontal,
  Send,
  FileCode,
  FileDown,
} from "lucide-react";
import { useSlicerStore } from "../../stores/slicer-store";
import { useToastStore } from "../../stores/toast-store";
import { SendToPrinterDialog } from "./SendToPrinterDialog";
import type { PrinterProfile, FilamentProfile, ProcessProfile } from "../../stores/slicer-store";
import { SettingsTabs } from "./settings/SettingsTabs";
import { GcodeEditor } from "./GcodeEditor";

interface SliceResultData {
  outputPath?: string;
  estimatedTime?: number;
  estimatedMaterial?: number;
  layerCount?: number;
  gcodeId?: string;
}

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

const selectClass =
  "w-full rounded-md border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-xs text-zinc-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none";

export function SlicePanel() {
  const {
    selectedModelId,
    printerProfiles,
    filamentProfiles,
    processProfiles,
    selectedPrinterProfileId,
    selectedFilamentProfileId,
    selectedProcessProfileId,
    setPrinterProfiles,
    setFilamentProfiles,
    setProcessProfiles,
    selectPrinterProfile,
    selectFilamentProfile,
    selectProcessProfile,
    sliceOverrides,
    setSliceOverrides,
  } = useSlicerStore();

  const [result, setResult] = useState<SliceResultData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sendDialogOpen, setSendDialogOpen] = useState(false);
  const [gcodeEditorOpen, setGcodeEditorOpen] = useState(false);
  const addToast = useToastStore((s) => s.addToast);
  const importFileRef = useRef<HTMLInputElement>(null);

  // Export a profile as JSON download
  const handleExport = useCallback(
    async (type: "printer" | "filament" | "process", id: string | null) => {
      if (!id) return;
      try {
        const res = await fetch(`/api/${type}-profiles/${id}/export`);
        if (!res.ok) throw new Error("Export failed");
        const blob = await res.blob();
        const contentDisposition = res.headers.get("Content-Disposition");
        const filenameMatch = contentDisposition?.match(/filename="(.+)"/);
        const filename = filenameMatch?.[1] ?? `${type}_profile.json`;
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        addToast({ type: "success", message: `${type} profile exported` });
      } catch {
        addToast({ type: "error", message: `Failed to export ${type} profile` });
      }
    },
    [addToast]
  );

  // Import a profile from JSON file
  const handleImportFile = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      // Reset the input so the same file can be re-imported
      e.target.value = "";
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        if (!data.type || !data.name || !data.settings) {
          addToast({ type: "error", message: "Invalid profile JSON: missing type, name, or settings" });
          return;
        }
        const res = await fetch("/api/profiles/import", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: text,
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error ?? "Import failed");
        }
        const result = await res.json();
        addToast({ type: "success", message: `Imported ${data.type} profile: ${data.name}` });
        // Refresh the relevant profile list
        if (data.type === "printer") {
          const r = await fetch("/api/printer-profiles");
          if (r.ok) setPrinterProfiles(await r.json());
        } else if (data.type === "filament") {
          const r = await fetch("/api/filament-profiles");
          if (r.ok) setFilamentProfiles(await r.json());
        } else if (data.type === "process") {
          const r = await fetch("/api/process-profiles");
          if (r.ok) setProcessProfiles(await r.json());
        }
      } catch (err) {
        addToast({
          type: "error",
          message: err instanceof Error ? err.message : "Failed to import profile",
        });
      }
    },
    [addToast, setPrinterProfiles, setFilamentProfiles, setProcessProfiles]
  );

  // Fetch tri-profiles on mount
  useEffect(() => {
    async function loadTriProfiles() {
      try {
        const [printerRes, filamentRes, processRes] = await Promise.all([
          fetch("/api/printer-profiles"),
          fetch("/api/filament-profiles"),
          fetch("/api/process-profiles"),
        ]);
        if (printerRes.ok) {
          const data: PrinterProfile[] = await printerRes.json();
          setPrinterProfiles(data);
        }
        if (filamentRes.ok) {
          const data: FilamentProfile[] = await filamentRes.json();
          setFilamentProfiles(data);
        }
        if (processRes.ok) {
          const data: ProcessProfile[] = await processRes.json();
          setProcessProfiles(data);
        }
      } catch (err) {
        console.error("Failed to load tri-profiles:", err);
      }
    }
    loadTriProfiles();
  }, [setPrinterProfiles, setFilamentProfiles, setProcessProfiles]);

  // When a process profile is selected, seed the slice overrides from the profile defaults
  const selectedProcess = processProfiles.find((p) => p.id === selectedProcessProfileId);
  useEffect(() => {
    if (selectedProcess) {
      const seeded: Record<string, unknown> = {};
      if (selectedProcess.layerHeight != null) seeded.layerHeight = selectedProcess.layerHeight;
      if (selectedProcess.firstLayerHeight != null) seeded.firstLayerHeight = selectedProcess.firstLayerHeight;
      if (selectedProcess.infillDensity != null) seeded.infillDensity = selectedProcess.infillDensity;
      if (selectedProcess.infillPattern != null) seeded.infillPattern = selectedProcess.infillPattern;
      if (selectedProcess.wallCount != null) seeded.wallCount = selectedProcess.wallCount;
      if (selectedProcess.supportType != null) seeded.supportType = selectedProcess.supportType;
      if (selectedProcess.supportThreshold != null) seeded.supportThreshold = selectedProcess.supportThreshold;
      if (selectedProcess.printSpeedPerimeter != null) seeded.printSpeedPerimeter = selectedProcess.printSpeedPerimeter;
      if (selectedProcess.printSpeedInfill != null) seeded.printSpeedInfill = selectedProcess.printSpeedInfill;
      if (Object.keys(seeded).length > 0) setSliceOverrides(seeded);
    }
  }, [selectedProcess, setSliceOverrides]);

  const handleDownload = useCallback(() => {
    if (!result?.outputPath) return;
    window.open(result.outputPath, "_blank");
  }, [result]);

  return (
    <div className="flex flex-col gap-3">
      {/* Hidden file input for profile import */}
      <input
        ref={importFileRef}
        type="file"
        accept=".json"
        className="hidden"
        onChange={handleImportFile}
      />

      {/* Import Profile button */}
      <button
        type="button"
        onClick={() => importFileRef.current?.click()}
        className="flex items-center justify-center gap-1.5 w-full py-1.5 rounded-md border border-dashed border-zinc-600 text-xs text-zinc-400 hover:text-blue-400 hover:border-blue-500/40 transition-colors"
      >
        <Upload size={13} />
        Import Profile
      </button>

      {/* Printer profile selector */}
      <div>
        <label className="flex items-center gap-1.5 text-[10px] font-medium text-zinc-400 uppercase tracking-wide mb-1">
          <Printer size={12} className="text-zinc-500" />
          Printer
        </label>
        <div className="flex gap-1.5">
          <select
            value={selectedPrinterProfileId ?? ""}
            onChange={(e) => selectPrinterProfile(e.target.value || null)}
            className={selectClass}
          >
            <option value="">Select printer...</option>
            {printerProfiles.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
                {p.bedSizeX && p.bedSizeY ? ` (${p.bedSizeX}x${p.bedSizeY})` : ""}
              </option>
            ))}
          </select>
          <button
            type="button"
            title="Export Printer Profile"
            disabled={!selectedPrinterProfileId}
            onClick={() => handleExport("printer", selectedPrinterProfileId)}
            className="flex items-center justify-center px-2 rounded-md border border-zinc-700 bg-zinc-800 text-zinc-400 hover:text-blue-400 hover:border-blue-500/40 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <FileDown size={14} />
          </button>
          <button
            type="button"
            title="Edit Start/End G-code"
            disabled={!selectedPrinterProfileId}
            onClick={() => setGcodeEditorOpen(true)}
            className="flex items-center justify-center px-2 rounded-md border border-zinc-700 bg-zinc-800 text-zinc-400 hover:text-green-400 hover:border-green-500/40 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <FileCode size={14} />
          </button>
        </div>
      </div>

      {/* Filament profile selector */}
      <div>
        <label className="flex items-center gap-1.5 text-[10px] font-medium text-zinc-400 uppercase tracking-wide mb-1">
          <Palette size={12} className="text-zinc-500" />
          Filament
        </label>
        <div className="flex gap-1.5">
          <select
            value={selectedFilamentProfileId ?? ""}
            onChange={(e) => selectFilamentProfile(e.target.value || null)}
            className={selectClass}
          >
            <option value="">Select filament...</option>
            {filamentProfiles.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
                {p.materialType ? ` [${p.materialType}]` : ""}
                {p.nozzleTemp ? ` ${p.nozzleTemp}C` : ""}
              </option>
            ))}
          </select>
          <button
            type="button"
            title="Export Filament Profile"
            disabled={!selectedFilamentProfileId}
            onClick={() => handleExport("filament", selectedFilamentProfileId)}
            className="flex items-center justify-center px-2 rounded-md border border-zinc-700 bg-zinc-800 text-zinc-400 hover:text-blue-400 hover:border-blue-500/40 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <FileDown size={14} />
          </button>
        </div>
      </div>

      {/* Process profile selector */}
      <div>
        <label className="flex items-center gap-1.5 text-[10px] font-medium text-zinc-400 uppercase tracking-wide mb-1">
          <SlidersHorizontal size={12} className="text-zinc-500" />
          Process
        </label>
        <div className="flex gap-1.5">
          <select
            value={selectedProcessProfileId ?? ""}
            onChange={(e) => selectProcessProfile(e.target.value || null)}
            className={selectClass}
          >
            <option value="">Select process...</option>
            {processProfiles.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
                {p.layerHeight != null ? ` ${p.layerHeight}mm` : ""}
                {p.infillDensity != null ? ` ${p.infillDensity}%` : ""}
              </option>
            ))}
          </select>
          <button
            type="button"
            title="Export Process Profile"
            disabled={!selectedProcessProfileId}
            onClick={() => handleExport("process", selectedProcessProfileId)}
            className="flex items-center justify-center px-2 rounded-md border border-zinc-700 bg-zinc-800 text-zinc-400 hover:text-blue-400 hover:border-blue-500/40 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <FileDown size={14} />
          </button>
        </div>
      </div>

      {/* Tabbed settings panel (Bambu Studio style) */}
      <SettingsTabs />

      {/* Slice result info (shown after slicing, no SLICE button here — it is in the sticky footer) */}
      {result && (
        <div className="rounded-lg border border-green-500/30 bg-green-500/10 p-3 flex flex-col gap-2">
          <div className="flex items-center gap-2 text-sm text-green-400 font-semibold">
            <CheckCircle2 size={16} />
            Slice Complete
          </div>
          {result.estimatedTime != null && (
            <div className="flex items-center gap-1.5 text-xs text-zinc-300">
              <Clock size={12} className="text-zinc-500" />
              <span className="text-zinc-400">Est. time:</span>
              <span className="font-mono">{formatTime(result.estimatedTime)}</span>
            </div>
          )}
          {result.estimatedMaterial != null && (
            <div className="flex items-center gap-1.5 text-xs text-zinc-300">
              <Droplets size={12} className="text-zinc-500" />
              <span className="text-zinc-400">Material:</span>
              <span className="font-mono">{result.estimatedMaterial.toFixed(1)}g</span>
            </div>
          )}
          {result.layerCount != null && (
            <div className="text-[10px] text-zinc-500">
              {result.layerCount.toLocaleString()} layers
            </div>
          )}
          <div className="flex gap-1.5 mt-1">
            <button
              type="button"
              onClick={handleDownload}
              className="flex flex-1 items-center justify-center gap-1.5 px-3 py-1.5 rounded-md bg-zinc-800 border border-zinc-700 text-xs text-zinc-300 hover:bg-zinc-700 hover:text-white transition-colors"
            >
              <Download size={12} />
              Download
            </button>
          </div>
          <button
            type="button"
            onClick={() => setSendDialogOpen(true)}
            className="flex items-center justify-center gap-1.5 w-full py-2 rounded-md bg-gradient-to-r from-emerald-600 to-teal-600 text-xs font-semibold text-white hover:from-emerald-500 hover:to-teal-500 transition-all shadow-sm"
          >
            <Send size={13} />
            Send to Printer
          </button>
          <SendToPrinterDialog
            open={sendDialogOpen}
            onClose={() => setSendDialogOpen(false)}
            gcodeId={result.gcodeId ?? ""}
            jobName={result.outputPath?.split("/").pop()?.replace(/\.[^.]+$/, "")}
            onSent={(printerName) => {
              addToast({
                type: "success",
                message: `Job sent to ${printerName}`,
                duration: 5000,
              });
            }}
          />
        </div>
      )}

      {error && (
        <div className="rounded-md border border-red-500/30 bg-red-500/10 p-2.5 flex items-center gap-1.5 text-xs text-red-400">
          <XCircle size={14} />
          {error}
        </div>
      )}

      {/* G-code Editor Modal */}
      {gcodeEditorOpen && selectedPrinterProfileId && (() => {
        const selectedPrinter = printerProfiles.find((p) => p.id === selectedPrinterProfileId);
        if (!selectedPrinter) return null;
        return (
          <GcodeEditor
            printerProfileId={selectedPrinter.id}
            printerName={selectedPrinter.name}
            initialStartGcode={selectedPrinter.startGcode}
            initialEndGcode={selectedPrinter.endGcode}
            onSave={async (startGcode, endGcode) => {
              const res = await fetch(`/api/printer-profiles/${selectedPrinter.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ startGcode, endGcode }),
              });
              if (!res.ok) throw new Error("Failed to save G-code");
              // Update the local profile list with saved gcode
              const updated = await res.json();
              setPrinterProfiles(
                printerProfiles.map((p) =>
                  p.id === updated.id
                    ? { ...p, startGcode: updated.startGcode, endGcode: updated.endGcode }
                    : p
                )
              );
            }}
            onClose={() => setGcodeEditorOpen(false)}
          />
        );
      })()}
    </div>
  );
}
