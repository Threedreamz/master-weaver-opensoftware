"use client";

import { useMemo, useState, useRef, useEffect } from "react";
import { useSlicerStore } from "../../stores/slicer-store";
import type { SlicerModel, HeightRangeModifier } from "../../stores/slicer-store";
import { PerObjectSettingsModal } from "./PerObjectSettingsModal";
import { HeightRangeEditor } from "./HeightRangeEditor";
import { getFilamentColor } from "../../lib/filament-colors";

export function ObjectTree() {
  const allModels = useSlicerStore((s) => s.models);
  const plates = useSlicerStore((s) => s.plates);
  const activePlateId = useSlicerStore((s) => s.activePlateId);
  const selectedModelIds = useSlicerStore((s) => s.selectedModelIds);
  const selectModel = useSlicerStore((s) => s.selectModel);
  const removeModel = useSlicerStore((s) => s.removeModel);
  const perObjectSettings = useSlicerStore((s) => s.perObjectSettings);
  const heightModifiers = useSlicerStore((s) => s.heightModifiers);
  const setPerObjectSettings = useSlicerStore((s) => s.setPerObjectSettings);
  const clearPerObjectSettings = useSlicerStore((s) => s.clearPerObjectSettings);
  const addHeightModifier = useSlicerStore((s) => s.addHeightModifier);
  const removeHeightModifier = useSlicerStore((s) => s.removeHeightModifier);
  const updateHeightModifier = useSlicerStore((s) => s.updateHeightModifier);
  const filamentProfiles = useSlicerStore((s) => s.filamentProfiles);
  const filamentAssignments = useSlicerStore((s) => s.filamentAssignments);
  const setFilamentAssignment = useSlicerStore((s) => s.setFilamentAssignment);
  const clearFilamentAssignment = useSlicerStore((s) => s.clearFilamentAssignment);
  const selectedFilamentProfileId = useSlicerStore((s) => s.selectedFilamentProfileId);

  // UI state
  const [expandedModels, setExpandedModels] = useState<Set<string>>(new Set());
  const [settingsModalModelId, setSettingsModalModelId] = useState<string | null>(null);
  const [heightEditorState, setHeightEditorState] = useState<{
    modelId: string;
    modifier?: HeightRangeModifier;
  } | null>(null);
  const [filamentDropdownModelId, setFilamentDropdownModelId] = useState<string | null>(null);
  const filamentDropdownRef = useRef<HTMLDivElement>(null);

  // Close filament dropdown on outside click
  useEffect(() => {
    if (!filamentDropdownModelId) return;
    const handleClick = (e: MouseEvent) => {
      if (filamentDropdownRef.current && !filamentDropdownRef.current.contains(e.target as Node)) {
        setFilamentDropdownModelId(null);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [filamentDropdownModelId]);

  /** Resolve the filament color for a model based on its assignment or global default */
  const getModelFilamentColor = (modelId: string): string => {
    const assignedId = filamentAssignments[modelId] ?? selectedFilamentProfileId;
    const profile = filamentProfiles.find((f) => f.id === assignedId);
    return getFilamentColor(profile?.materialType);
  };

  // Filter models to active plate
  const activePlate = plates.find((p) => p.id === activePlateId);
  const activePlateModelIds = useMemo(
    () => new Set(activePlate?.modelIds ?? []),
    [activePlate]
  );
  const models = useMemo(
    () => allModels.filter((m) => activePlateModelIds.has(m.id)),
    [allModels, activePlateModelIds]
  );

  const toggleExpand = (id: string) => {
    setExpandedModels((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (models.length === 0) {
    return (
      <p className="px-2 py-4 text-center text-xs text-zinc-500">
        No models loaded. Click Upload or drag files here.
      </p>
    );
  }

  const settingsModalModel = settingsModalModelId
    ? models.find((m) => m.id === settingsModalModelId)
    : null;
  const heightEditorModel = heightEditorState
    ? models.find((m) => m.id === heightEditorState.modelId)
    : null;

  return (
    <>
      <ul className="space-y-0.5">
        {models.map((model) => {
          const isSelected = selectedModelIds.includes(model.id);
          const isExpanded = expandedModels.has(model.id);
          const overrides = perObjectSettings[model.id];
          const modifiers = heightModifiers[model.id] ?? [];
          const overrideCount = overrides ? Object.keys(overrides).length : 0;

          return (
            <li key={model.id}>
              {/* Model row */}
              <div
                onClick={(e) => selectModel(model.id, e.ctrlKey || e.metaKey)}
                role="button"
                tabIndex={0}
                className={`flex w-full cursor-pointer items-center gap-1 rounded-md px-1.5 py-1.5 text-left text-sm transition-colors ${
                  isSelected
                    ? "bg-indigo-600/15 text-indigo-300 border-l-2 border-indigo-500 pl-1"
                    : "text-zinc-300 hover:bg-zinc-800 border-l-2 border-transparent"
                }`}
              >
                {/* Filament color swatch */}
                <div className="relative shrink-0">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setFilamentDropdownModelId(
                        filamentDropdownModelId === model.id ? null : model.id
                      );
                    }}
                    className="flex h-4 w-4 items-center justify-center"
                    title="Assign filament"
                  >
                    <span
                      className="inline-block h-2 w-2 rounded-full ring-1 ring-white/20"
                      style={{ backgroundColor: getModelFilamentColor(model.id) }}
                    />
                  </button>

                  {/* Filament selector dropdown */}
                  {filamentDropdownModelId === model.id && (
                    <div
                      ref={filamentDropdownRef}
                      className="absolute left-0 top-5 z-50 min-w-[160px] rounded-md border border-zinc-700 bg-zinc-800 py-1 shadow-xl"
                    >
                      {filamentProfiles.length === 0 ? (
                        <div className="px-3 py-2 text-[11px] text-zinc-500">
                          No filament profiles
                        </div>
                      ) : (
                        <>
                          {filamentProfiles.map((fp) => {
                            const color = getFilamentColor(fp.materialType);
                            const isAssigned = filamentAssignments[model.id] === fp.id;
                            return (
                              <button
                                key={fp.id}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setFilamentAssignment(model.id, fp.id);
                                  setFilamentDropdownModelId(null);
                                }}
                                className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs hover:bg-zinc-700 ${
                                  isAssigned ? "text-indigo-300 bg-indigo-600/10" : "text-zinc-300"
                                }`}
                              >
                                <span
                                  className="inline-block h-2.5 w-2.5 shrink-0 rounded-full ring-1 ring-white/20"
                                  style={{ backgroundColor: color }}
                                />
                                <span className="truncate">{fp.name}</span>
                                {fp.materialType && (
                                  <span className="ml-auto text-[9px] text-zinc-500">
                                    {fp.materialType}
                                  </span>
                                )}
                              </button>
                            );
                          })}
                          {filamentAssignments[model.id] && (
                            <>
                              <div className="my-1 border-t border-zinc-700" />
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  clearFilamentAssignment(model.id);
                                  setFilamentDropdownModelId(null);
                                }}
                                className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-zinc-500 hover:bg-zinc-700 hover:text-zinc-300"
                              >
                                Use global default
                              </button>
                            </>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>

                {/* Expand/collapse arrow */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleExpand(model.id);
                  }}
                  className="flex h-4 w-4 shrink-0 items-center justify-center text-zinc-500 hover:text-zinc-300"
                >
                  <svg
                    className={`h-3 w-3 transition-transform ${isExpanded ? "rotate-90" : ""}`}
                    viewBox="0 0 12 12"
                    fill="currentColor"
                  >
                    <path d="M4 2l4 4-4 4V2z" />
                  </svg>
                </button>

                {/* Model name + info */}
                <span className="min-w-0 flex-1 truncate">{model.name}</span>

                {/* Override badge */}
                {overrideCount > 0 && (
                  <span className="shrink-0 rounded bg-indigo-600/30 px-1 text-[9px] text-indigo-400">
                    {overrideCount}
                  </span>
                )}

                {/* Triangle count */}
                {model.triangleCount != null && (
                  <span className="shrink-0 text-[10px] text-zinc-600">
                    {model.triangleCount >= 1000
                      ? `${(model.triangleCount / 1000).toFixed(0)}k`
                      : model.triangleCount}
                  </span>
                )}

                {/* Remove button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeModel(model.id);
                  }}
                  className="shrink-0 text-zinc-500 hover:text-red-400"
                  title="Remove model"
                >
                  &times;
                </button>
              </div>

              {/* Expanded children */}
              {isExpanded && (
                <div className="ml-5 space-y-0.5 border-l border-zinc-800 pl-2 pt-0.5">
                  {/* Per-Object Settings row */}
                  <button
                    onClick={() => setSettingsModalModelId(model.id)}
                    className="flex w-full items-center gap-1.5 rounded px-2 py-1 text-left text-xs text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
                  >
                    <svg className="h-3 w-3 shrink-0" viewBox="0 0 16 16" fill="currentColor">
                      <path d="M8 4.754a3.246 3.246 0 100 6.492 3.246 3.246 0 000-6.492zM5.754 8a2.246 2.246 0 114.492 0 2.246 2.246 0 01-4.492 0z" />
                      <path d="M9.796 1.343c-.527-1.79-3.065-1.79-3.592 0l-.094.319a.873.873 0 01-1.255.52l-.292-.16c-1.64-.892-3.433.902-2.54 2.541l.159.292a.873.873 0 01-.52 1.255l-.319.094c-1.79.527-1.79 3.065 0 3.592l.319.094a.873.873 0 01.52 1.255l-.16.292c-.892 1.64.902 3.434 2.541 2.54l.292-.159a.873.873 0 011.255.52l.094.319c.527 1.79 3.065 1.79 3.592 0l.094-.319a.873.873 0 011.255-.52l.292.16c1.64.893 3.434-.902 2.54-2.541l-.159-.292a.873.873 0 01.52-1.255l.319-.094c1.79-.527 1.79-3.065 0-3.592l-.319-.094a.873.873 0 01-.52-1.255l.16-.292c.893-1.64-.902-3.433-2.541-2.54l-.292.159a.873.873 0 01-1.255-.52l-.094-.319z" />
                    </svg>
                    <span>Per-Object Settings</span>
                    {overrideCount > 0 && (
                      <span className="ml-auto text-[9px] text-indigo-400">
                        {overrideCount} override{overrideCount > 1 ? "s" : ""}
                      </span>
                    )}
                  </button>

                  {/* Height range modifiers */}
                  {modifiers.map((mod) => (
                    <button
                      key={mod.id}
                      onClick={() =>
                        setHeightEditorState({ modelId: model.id, modifier: mod })
                      }
                      className="flex w-full items-center gap-1.5 rounded px-2 py-1 text-left text-xs text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
                    >
                      <svg className="h-3 w-3 shrink-0" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M2 2v12h12V2H2zm1 1h10v10H3V3zm2 3h6v1H5V6zm0 3h6v1H5V9z" />
                      </svg>
                      <span>
                        Z {mod.zMin.toFixed(1)}-{mod.zMax.toFixed(1)} mm
                      </span>
                      <span className="ml-auto text-[9px] text-zinc-600">
                        {Object.keys(mod.settings).length} setting
                        {Object.keys(mod.settings).length !== 1 ? "s" : ""}
                      </span>
                    </button>
                  ))}

                  {/* Add Height Range button */}
                  <button
                    onClick={() =>
                      setHeightEditorState({ modelId: model.id })
                    }
                    className="flex w-full items-center gap-1.5 rounded px-2 py-1 text-left text-xs text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300"
                  >
                    <span className="flex h-3 w-3 items-center justify-center text-xs">+</span>
                    <span>Add Height Range</span>
                  </button>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {/* Per-Object Settings Modal */}
      {settingsModalModel && (
        <PerObjectSettingsModal
          modelName={settingsModalModel.name}
          currentOverrides={perObjectSettings[settingsModalModel.id] ?? {}}
          onApply={(overrides) => {
            if (Object.keys(overrides).length > 0) {
              setPerObjectSettings(settingsModalModel.id, overrides);
            } else {
              clearPerObjectSettings(settingsModalModel.id);
            }
            setSettingsModalModelId(null);
          }}
          onCancel={() => setSettingsModalModelId(null)}
        />
      )}

      {/* Height Range Editor Modal */}
      {heightEditorModel && heightEditorState && (
        <HeightRangeEditor
          modelName={heightEditorModel.name}
          modelHeight={heightEditorModel.boundingBox?.z}
          modifier={heightEditorState.modifier}
          onSave={(data) => {
            const modelId = heightEditorState.modelId;
            if (data.id) {
              // Editing existing
              updateHeightModifier(modelId, data.id, {
                zMin: data.zMin,
                zMax: data.zMax,
                settings: data.settings,
              });
            } else {
              // Adding new
              addHeightModifier(modelId, {
                id: `hr-${Date.now()}`,
                zMin: data.zMin,
                zMax: data.zMax,
                settings: data.settings,
              });
            }
            setHeightEditorState(null);
          }}
          onDelete={
            heightEditorState.modifier
              ? () => {
                  removeHeightModifier(
                    heightEditorState.modelId,
                    heightEditorState.modifier!.id
                  );
                  setHeightEditorState(null);
                }
              : undefined
          }
          onCancel={() => setHeightEditorState(null)}
        />
      )}
    </>
  );
}
