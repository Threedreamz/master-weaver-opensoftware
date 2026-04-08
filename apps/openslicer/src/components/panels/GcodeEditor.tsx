"use client";

import { useState, useEffect, useCallback } from "react";
import { X, ChevronDown, ChevronRight, Save, RotateCcw } from "lucide-react";

const DEFAULT_START_GCODE = `G28 ; Home all axes
G1 Z5 F3000 ; Raise Z
M104 S{nozzle_temp} ; Set nozzle temp
M140 S{bed_temp} ; Set bed temp
M109 S{nozzle_temp} ; Wait for nozzle
M190 S{bed_temp} ; Wait for bed
G92 E0 ; Reset extruder
G1 Z0.3 F3000 ; Move to first layer`;

const DEFAULT_END_GCODE = `M104 S0 ; Turn off nozzle
M140 S0 ; Turn off bed
M107 ; Turn off fan
G28 X Y ; Home X Y
M84 ; Disable motors`;

const MACRO_VARIABLES = [
  { name: "{nozzle_temp}", description: "Nozzle temperature from filament profile" },
  { name: "{bed_temp}", description: "Bed temperature from filament profile" },
  { name: "{layer_height}", description: "Layer height from process profile" },
  { name: "{first_layer_height}", description: "First layer height from process profile" },
  { name: "{nozzle_diameter}", description: "Nozzle diameter from printer profile" },
  { name: "{filament_diameter}", description: "Filament diameter (default 1.75)" },
  { name: "{print_speed}", description: "Print speed from process profile" },
  { name: "{travel_speed}", description: "Travel speed from process profile" },
];

interface GcodeEditorProps {
  printerProfileId: string;
  printerName: string;
  initialStartGcode?: string | null;
  initialEndGcode?: string | null;
  onSave: (startGcode: string, endGcode: string) => Promise<void>;
  onClose: () => void;
}

type Tab = "start" | "end";

export function GcodeEditor({
  printerProfileId,
  printerName,
  initialStartGcode,
  initialEndGcode,
  onSave,
  onClose,
}: GcodeEditorProps) {
  const [activeTab, setActiveTab] = useState<Tab>("start");
  const [startGcode, setStartGcode] = useState(initialStartGcode || DEFAULT_START_GCODE);
  const [endGcode, setEndGcode] = useState(initialEndGcode || DEFAULT_END_GCODE);
  const [showVariables, setShowVariables] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentText = activeTab === "start" ? startGcode : endGcode;
  const setCurrentText = activeTab === "start" ? setStartGcode : setEndGcode;

  const handleSave = useCallback(async () => {
    setSaving(true);
    setError(null);
    try {
      await onSave(startGcode, endGcode);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }, [startGcode, endGcode, onSave, onClose]);

  const handleResetDefaults = useCallback(() => {
    if (activeTab === "start") {
      setStartGcode(DEFAULT_START_GCODE);
    } else {
      setEndGcode(DEFAULT_END_GCODE);
    }
  }, [activeTab]);

  // Close on Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-[640px] max-h-[85vh] flex flex-col rounded-xl border border-zinc-700 bg-zinc-900 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-700">
          <div>
            <h2 className="text-sm font-semibold text-zinc-100">G-code Editor</h2>
            <p className="text-[10px] text-zinc-500 mt-0.5">{printerName}</p>
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
            onClick={() => setActiveTab("start")}
            className={`flex-1 px-4 py-2 text-xs font-medium uppercase tracking-wide transition-colors ${
              activeTab === "start"
                ? "text-green-400 border-b-2 border-green-400 bg-zinc-800/50"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            Start G-code
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("end")}
            className={`flex-1 px-4 py-2 text-xs font-medium uppercase tracking-wide transition-colors ${
              activeTab === "end"
                ? "text-red-400 border-b-2 border-red-400 bg-zinc-800/50"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            End G-code
          </button>
        </div>

        {/* Editor */}
        <div className="flex-1 overflow-hidden flex flex-col">
          <textarea
            value={currentText}
            onChange={(e) => setCurrentText(e.target.value)}
            spellCheck={false}
            className="flex-1 min-h-[260px] w-full resize-none bg-zinc-950 text-green-400 font-mono text-xs leading-relaxed p-4 border-none outline-none focus:ring-0 placeholder:text-zinc-700"
            placeholder={`Enter ${activeTab} G-code...`}
          />

          {/* Variables Reference */}
          <div className="border-t border-zinc-800">
            <button
              type="button"
              onClick={() => setShowVariables(!showVariables)}
              className="flex items-center gap-1.5 w-full px-4 py-2 text-[10px] font-medium text-zinc-500 uppercase tracking-wide hover:text-zinc-400 transition-colors"
            >
              {showVariables ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
              Variables Reference
            </button>
            {showVariables && (
              <div className="px-4 pb-3 grid grid-cols-2 gap-x-4 gap-y-1">
                {MACRO_VARIABLES.map((v) => (
                  <div key={v.name} className="flex items-baseline gap-2">
                    <code className="text-[10px] font-mono text-amber-400 whitespace-nowrap">{v.name}</code>
                    <span className="text-[9px] text-zinc-600 truncate">{v.description}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

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
            onClick={handleResetDefaults}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-zinc-500 hover:text-zinc-300 rounded-md hover:bg-zinc-800 transition-colors"
          >
            <RotateCcw size={12} />
            Reset to defaults
          </button>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 text-xs text-zinc-400 rounded-md border border-zinc-700 hover:bg-zinc-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium text-white rounded-md bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Save size={12} />
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
