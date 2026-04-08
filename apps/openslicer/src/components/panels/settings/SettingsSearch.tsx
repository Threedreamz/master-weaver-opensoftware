"use client";

import { useState, useMemo } from "react";
import { Search, X } from "lucide-react";
import { useSlicerStore } from "../../../stores/slicer-store";

export interface SettingsSearchEntry {
  key: string;
  label: string;
  tab: string;
  description: string;
}

/**
 * Searchable index of all slicer settings across all tabs.
 * Each entry maps a sliceOverrides key to its human label, tab, and description.
 */
const SETTINGS_INDEX: SettingsSearchEntry[] = [
  // Quality tab
  { key: "layerHeight", label: "Layer Height", tab: "quality", description: "Height of each printed layer (mm)" },
  { key: "firstLayerHeight", label: "First Layer Height", tab: "quality", description: "Height of the first layer for bed adhesion (mm)" },
  { key: "adaptiveLayerHeight", label: "Adaptive Layer Height", tab: "quality", description: "Varies layer height based on model geometry" },
  { key: "seamPosition", label: "Seam Position", tab: "quality", description: "Where each layer starts (nearest, aligned, random, rear)" },
  { key: "ironing", label: "Ironing", tab: "quality", description: "Smooth top surfaces with extra nozzle pass" },
  { key: "fuzzySkin", label: "Fuzzy Skin", tab: "quality", description: "Textured, matte surface finish via random vibrations" },

  // Strength tab
  { key: "wallCount", label: "Wall Count", tab: "strength", description: "Number of outer wall loops" },
  { key: "topLayers", label: "Top Layers", tab: "strength", description: "Solid layers on top surfaces" },
  { key: "bottomLayers", label: "Bottom Layers", tab: "strength", description: "Solid layers on bottom surfaces" },
  { key: "infillDensity", label: "Infill Density", tab: "strength", description: "Percentage of interior filled (%)" },
  { key: "infillPattern", label: "Infill Pattern", tab: "strength", description: "Internal fill pattern (gyroid, grid, honeycomb, etc.)" },

  // Speed tab
  { key: "printSpeedPerimeter", label: "Perimeter Speed", tab: "speed", description: "Speed for outer and inner wall perimeters (mm/s)" },
  { key: "printSpeedInfill", label: "Infill Speed", tab: "speed", description: "Speed for internal infill (mm/s)" },
  { key: "travelSpeed", label: "Travel Speed", tab: "speed", description: "Speed when nozzle moves without extruding (mm/s)" },
  { key: "bridgeSpeed", label: "Bridge Speed", tab: "speed", description: "Speed for bridging unsupported spans (mm/s)" },
  { key: "firstLayerSpeed", label: "First Layer Speed", tab: "speed", description: "Speed for the first layer (mm/s)" },

  // Support tab
  { key: "supportType", label: "Support Type", tab: "support", description: "Type of support structures (none, normal, tree, organic)" },
  { key: "supportThreshold", label: "Support Threshold Angle", tab: "support", description: "Minimum overhang angle for support generation (degrees)" },
  { key: "supportOnBuildPlateOnly", label: "Build Plate Only", tab: "support", description: "Only generate supports touching the build plate" },

  // Others tab
  { key: "brimWidth", label: "Brim Width", tab: "others", description: "Extra loops around first layer for adhesion (mm)" },
  { key: "skirtDistance", label: "Skirt Distance", tab: "others", description: "Gap between skirt and model (mm)" },
  { key: "skirtLoops", label: "Skirt Loops", tab: "others", description: "Number of skirt outlines" },
  { key: "retractionLength", label: "Retract Length", tab: "others", description: "Distance filament is pulled back (mm)" },
  { key: "retractionSpeed", label: "Retract Speed", tab: "others", description: "Speed of filament retraction (mm/s)" },
  { key: "fanSpeedMin", label: "Fan Speed Min", tab: "others", description: "Minimum part cooling fan speed (%)" },
  { key: "fanSpeedMax", label: "Fan Speed Max", tab: "others", description: "Maximum part cooling fan speed (%)" },
  { key: "flowRatio", label: "Flow Ratio", tab: "others", description: "Extrusion amount multiplier" },
];

const TAB_LABELS: Record<string, string> = {
  quality: "Quality",
  strength: "Strength",
  speed: "Speed",
  support: "Support",
  others: "Others",
};

interface SettingsSearchProps {
  onSearchActive: (active: boolean) => void;
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
}

export function SettingsSearch({ onSearchActive, searchQuery, onSearchQueryChange }: SettingsSearchProps) {
  const sliceOverrides = useSlicerStore((s) => s.sliceOverrides);
  const setActiveSettingsTab = useSlicerStore((s) => s.setActiveSettingsTab);

  const filteredSettings = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    return SETTINGS_INDEX.filter(
      (entry) =>
        entry.label.toLowerCase().includes(q) ||
        entry.description.toLowerCase().includes(q) ||
        entry.key.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  const handleClear = () => {
    onSearchQueryChange("");
    onSearchActive(false);
  };

  const handleChange = (value: string) => {
    onSearchQueryChange(value);
    onSearchActive(value.trim().length > 0);
  };

  const handleResultClick = (entry: SettingsSearchEntry) => {
    // Navigate to the tab containing this setting
    setActiveSettingsTab(entry.tab);
    handleClear();
  };

  const formatValue = (key: string): string => {
    const val = sliceOverrides[key as keyof typeof sliceOverrides];
    if (val === undefined || val === null) return "--";
    if (typeof val === "boolean") return val ? "On" : "Off";
    return String(val);
  };

  return (
    <div className="relative">
      <div className="relative flex items-center">
        <Search size={13} className="absolute left-2 text-zinc-500 pointer-events-none" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => handleChange(e.target.value)}
          placeholder="Search settings..."
          className="w-full rounded-md border border-zinc-700 bg-zinc-800 pl-7 pr-7 py-1.5 text-xs text-zinc-200 placeholder:text-zinc-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-2 text-zinc-500 hover:text-zinc-300"
          >
            <X size={13} />
          </button>
        )}
      </div>

      {/* Search results */}
      {searchQuery.trim() && (
        <div className="mt-1 flex flex-col gap-0.5 max-h-60 overflow-y-auto">
          {filteredSettings.length === 0 ? (
            <div className="px-2 py-2 text-xs text-zinc-500 text-center">
              No settings match &ldquo;{searchQuery}&rdquo;
            </div>
          ) : (
            filteredSettings.map((entry) => (
              <button
                key={entry.key}
                type="button"
                onClick={() => handleResultClick(entry)}
                className="flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left hover:bg-zinc-800 transition-colors group"
              >
                <div className="flex flex-col min-w-0">
                  <span className="text-xs text-zinc-200 truncate">{entry.label}</span>
                  <span className="text-[10px] text-zinc-500 truncate">{entry.description}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[10px] font-mono text-blue-400">
                    {formatValue(entry.key)}
                  </span>
                  <span className="rounded bg-zinc-700 px-1.5 py-0.5 text-[9px] text-zinc-400 uppercase">
                    {TAB_LABELS[entry.tab] ?? entry.tab}
                  </span>
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
