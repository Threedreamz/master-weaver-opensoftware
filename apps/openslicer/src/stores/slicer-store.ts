"use client";

import { create } from "zustand";
import type { ArcOverhangResult, ToolpathData, GcodeMetadata, MoveType } from "@opensoftware/slicer-core";
import type { GcodeColorMode } from "../lib/gcode-colors";
import { arrangeModels2D } from "../lib/arrange-2d";
import { undoMiddleware } from "./undo-middleware";
import type { UndoState } from "./undo-middleware";

export interface ProcessOverrides {
  layerHeight?: number;
  firstLayerHeight?: number;
  seamPosition?: string;
  ironing?: boolean;
  fuzzySkin?: boolean;
  adaptiveLayerHeight?: boolean;
  wallCount?: number;
  topLayers?: number;
  bottomLayers?: number;
  infillDensity?: number;
  infillPattern?: string;
  printSpeedPerimeter?: number;
  printSpeedInfill?: number;
  travelSpeed?: number;
  bridgeSpeed?: number;
  firstLayerSpeed?: number;
  supportType?: string;
  supportThreshold?: number;
  supportOnBuildPlateOnly?: boolean;
  brimWidth?: number;
  skirtDistance?: number;
  skirtLoops?: number;
  retractionLength?: number;
  retractionSpeed?: number;
  fanSpeedMin?: number;
  fanSpeedMax?: number;
  flowRatio?: number;
  spiralVaseMode?: boolean;
}

export interface HeightRangeModifier {
  id: string;
  zMin: number;
  zMax: number;
  settings: Partial<ProcessOverrides>;
}

export type GcodeVisibility = Record<MoveType, boolean>;

const DEFAULT_GCODE_VISIBILITY: GcodeVisibility = {
  outer_wall: true,
  inner_wall: true,
  infill: true,
  support: true,
  bridge: true,
  travel: false,
  skirt: true,
  wipe: true,
  custom: true,
};

export type ToolMode = 'select' | 'move' | 'rotate' | 'scale' | 'measure' | 'faceSelect' | 'paint' | 'cut';

export type PaintMode = 'support_enforcer' | 'support_blocker' | 'seam';

export interface ModelPaintData {
  supportEnforcers: number[];
  supportBlockers: number[];
  seamPositions: number[];
}

export interface SlicerModel {
  id: string;
  name: string;
  filename: string;
  url: string;
  fileFormat: string;
  fileSizeBytes: number;
  triangleCount?: number;
  boundingBox?: { x: number; y: number; z: number };
  volumeCm3?: number;
  surfaceAreaCm2?: number;
  isManifold?: boolean;
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: [number, number, number];
  meshAnalyzed: boolean;
  feasibility?: Record<
    string,
    { feasible: boolean; score: number; issues: string[] }
  >;
}

export interface SlicerProfile {
  id: string;
  name: string;
  technology: "fdm" | "sla" | "sls";
  slicerEngine: string;
  layerHeight?: number;
  infillDensity?: number;
  supportEnabled?: boolean;
}

export interface PrinterProfile {
  id: string;
  name: string;
  vendor?: string | null;
  model?: string | null;
  bedSizeX?: number | null;
  bedSizeY?: number | null;
  bedSizeZ?: number | null;
  nozzleDiameter?: number | null;
  firmwareFlavor?: string | null;
  startGcode?: string | null;
  endGcode?: string | null;
  isDefault?: boolean | null;
}

export interface FilamentProfile {
  id: string;
  name: string;
  materialType?: string | null;
  nozzleTemp?: number | null;
  bedTemp?: number | null;
  flowRatio?: number | null;
  filamentDensity?: number | null;
  filamentCostPerKg?: number | null;
  isDefault?: boolean | null;
}

export interface ProcessProfile {
  id: string;
  name: string;
  layerHeight?: number | null;
  firstLayerHeight?: number | null;
  infillDensity?: number | null;
  infillPattern?: string | null;
  supportType?: string | null;
  supportThreshold?: number | null;
  wallCount?: number | null;
  printSpeedPerimeter?: number | null;
  printSpeedInfill?: number | null;
  isDefault?: boolean | null;
}

export interface SliceJob {
  id: string;
  modelId: string;
  profileId: string;
  status: "pending" | "slicing" | "completed" | "failed";
  estimatedTime?: number;
  estimatedMaterial?: number;
  layerCount?: number;
  gcodeUrl?: string;
  errorMessage?: string;
}

interface ViewSettings {
  wireframe: boolean;
  axes: boolean;
  grid: boolean;
  snap: boolean;
}

export interface BuildPlateState {
  id: string;
  name: string;
  modelIds: string[];
}

export interface SlicerState {
  // Models
  models: SlicerModel[];
  selectedModelIds: string[];
  selectedModelId: string | null; // derived: first of selectedModelIds (backward compat)
  addModel: (model: SlicerModel) => void;
  removeModel: (id: string) => void;
  selectModel: (id: string | null, addToSelection?: boolean) => void;
  selectAllModels: () => void;
  clearSelection: () => void;
  duplicateModel: (id: string) => void;
  mirrorModel: (id: string, axis: 'x' | 'y' | 'z') => void;
  arrangeModels: () => void;
  updateModel: (id: string, data: Partial<SlicerModel>) => void;

  // Build Plates
  plates: BuildPlateState[];
  activePlateId: string;
  addPlate: () => void;
  removePlate: (id: string) => void;
  renamePlate: (id: string, name: string) => void;
  setActivePlate: (id: string) => void;
  moveModelToPlate: (modelId: string, plateId: string) => void;

  // Profiles (legacy - backward compat)
  profiles: SlicerProfile[];
  selectedProfileId: string | null;
  setProfiles: (profiles: SlicerProfile[]) => void;
  selectProfile: (id: string | null) => void;

  // Tri-Profile System
  printerProfiles: PrinterProfile[];
  filamentProfiles: FilamentProfile[];
  processProfiles: ProcessProfile[];
  selectedPrinterProfileId: string | null;
  selectedFilamentProfileId: string | null;
  selectedProcessProfileId: string | null;
  setPrinterProfiles: (profiles: PrinterProfile[]) => void;
  setFilamentProfiles: (profiles: FilamentProfile[]) => void;
  setProcessProfiles: (profiles: ProcessProfile[]) => void;
  selectPrinterProfile: (id: string | null) => void;
  selectFilamentProfile: (id: string | null) => void;
  selectProcessProfile: (id: string | null) => void;

  // Slicing
  sliceJobs: SliceJob[];
  activeSliceJobId: string | null;
  addSliceJob: (job: SliceJob) => void;
  updateSliceJob: (id: string, data: Partial<SliceJob>) => void;

  // Overhang analysis state
  overhangResult: ArcOverhangResult | null;
  showOverhangOverlay: boolean;
  showArcPaths: boolean;
  setOverhangResult: (result: ArcOverhangResult | null) => void;
  toggleOverhangOverlay: () => void;
  toggleArcPaths: () => void;

  // Face selection
  faceSelectionEnabled: boolean;
  selectedFace: { modelId: string; faceIndex: number; normal: [number, number, number] } | null;
  toggleFaceSelection: () => void;
  setSelectedFace: (face: { modelId: string; faceIndex: number; normal: [number, number, number] } | null) => void;
  updateModelRotation: (modelId: string, rotation: [number, number, number]) => void;

  // G-code viewer state
  gcodeMode: boolean;
  gcodeData: ToolpathData | null;
  gcodeMetadata: GcodeMetadata | null;
  currentLayer: number;
  totalLayers: number;
  gcodeColorMode: GcodeColorMode;
  gcodeVisibility: GcodeVisibility;
  showRetractions: boolean;
  setGcodeMode: (mode: boolean) => void;
  setGcodeData: (data: ToolpathData | null) => void;
  setGcodeMetadata: (meta: GcodeMetadata | null) => void;
  setCurrentLayer: (layer: number) => void;
  setGcodeColorMode: (mode: GcodeColorMode) => void;
  setGcodeVisibility: (visibility: GcodeVisibility) => void;
  toggleMoveTypeVisibility: (moveType: MoveType) => void;
  setShowRetractions: (show: boolean) => void;

  // Tool mode
  toolMode: ToolMode;
  setToolMode: (mode: ToolMode) => void;
  updateModelPosition: (modelId: string, position: [number, number, number]) => void;
  updateModelScale: (modelId: string, scale: [number, number, number]) => void;

  // UI State
  leftPanelOpen: boolean;
  rightPanelOpen: boolean;
  toggleLeftPanel: () => void;
  toggleRightPanel: () => void;
  viewSettings: ViewSettings;
  toggleViewSetting: (key: keyof ViewSettings) => void;

  // Per-Object Settings
  perObjectSettings: Record<string, ProcessOverrides>;
  heightModifiers: Record<string, HeightRangeModifier[]>;
  setPerObjectSettings: (modelId: string, settings: ProcessOverrides) => void;
  clearPerObjectSettings: (modelId: string) => void;
  addHeightModifier: (modelId: string, modifier: HeightRangeModifier) => void;
  removeHeightModifier: (modelId: string, modifierId: string) => void;
  updateHeightModifier: (modelId: string, modifierId: string, updates: Partial<HeightRangeModifier>) => void;

  // Settings tabs
  activeSettingsTab: string;
  setActiveSettingsTab: (tab: string) => void;
  sliceOverrides: ProcessOverrides;
  setSliceOverride: <K extends keyof ProcessOverrides>(key: K, value: ProcessOverrides[K]) => void;
  setSliceOverrides: (overrides: ProcessOverrides) => void;
  resetSliceOverrides: () => void;

  // Variable Layer Height
  variableLayerProfile: { z: number; height: number }[] | null;
  setVariableLayerProfile: (profile: { z: number; height: number }[] | null) => void;

  // Right panel tab (Global / Objects / Project)
  rightPanelTab: 'global' | 'objects' | 'project';
  setRightPanelTab: (tab: 'global' | 'objects' | 'project') => void;

  // Paint-on supports & seam painting
  paintMode: PaintMode | null;
  paintBrushSize: number;
  modelPaintData: Record<string, ModelPaintData>;
  setPaintMode: (mode: PaintMode | null) => void;
  setPaintBrushSize: (size: number) => void;
  addPaintedFaces: (modelId: string, mode: PaintMode, faceIndices: number[]) => void;
  removePaintedFaces: (modelId: string, mode: PaintMode, faceIndices: number[]) => void;
  clearPaintData: (modelId: string) => void;

  // Multi-Material / AMS — per-model filament assignments
  filamentAssignments: Record<string, string>; // modelId -> filamentProfileId
  setFilamentAssignment: (modelId: string, filamentProfileId: string) => void;
  clearFilamentAssignment: (modelId: string) => void;
}

export const useSlicerStore = create<SlicerState & UndoState>()(undoMiddleware<SlicerState>((set, get) => ({
  // Models
  models: [],
  selectedModelIds: [],
  selectedModelId: null,
  addModel: (model) =>
    set((state) => ({
      models: [...state.models, model],
      plates: state.plates.map((p) =>
        p.id === state.activePlateId
          ? { ...p, modelIds: [...p.modelIds, model.id] }
          : p
      ),
    })),
  removeModel: (id) =>
    set((state) => {
      const { [id]: _po, ...restPerObject } = state.perObjectSettings;
      const { [id]: _hm, ...restHeight } = state.heightModifiers;
      const { [id]: _pd, ...restPaint } = state.modelPaintData;
      const { [id]: _fa, ...restFilament } = state.filamentAssignments;
      const newSelectedIds = state.selectedModelIds.filter((sid) => sid !== id);
      return {
        models: state.models.filter((m) => m.id !== id),
        selectedModelIds: newSelectedIds,
        selectedModelId: newSelectedIds[0] ?? null,
        plates: state.plates.map((p) => ({
          ...p,
          modelIds: p.modelIds.filter((mid) => mid !== id),
        })),
        perObjectSettings: restPerObject,
        heightModifiers: restHeight,
        modelPaintData: restPaint,
        filamentAssignments: restFilament,
      };
    }),
  selectModel: (id, addToSelection) =>
    set((state) => {
      if (id === null) {
        return { selectedModelIds: [], selectedModelId: null };
      }
      if (addToSelection) {
        // Toggle in multi-select
        const exists = state.selectedModelIds.includes(id);
        const newIds = exists
          ? state.selectedModelIds.filter((sid) => sid !== id)
          : [...state.selectedModelIds, id];
        return { selectedModelIds: newIds, selectedModelId: newIds[0] ?? null };
      }
      // Single select — replace
      return { selectedModelIds: [id], selectedModelId: id };
    }),
  selectAllModels: () =>
    set((state) => {
      const activePlate = state.plates.find((p) => p.id === state.activePlateId);
      const ids = activePlate?.modelIds ?? [];
      return { selectedModelIds: ids, selectedModelId: ids[0] ?? null };
    }),
  clearSelection: () => set({ selectedModelIds: [], selectedModelId: null }),
  duplicateModel: (id) =>
    set((state) => {
      const original = state.models.find((m) => m.id === id);
      if (!original) return state;
      const newId = crypto.randomUUID();
      const clone: SlicerModel = {
        ...original,
        id: newId,
        name: `${original.name} (copy)`,
        position: [
          (original.position?.[0] ?? 0) + 20,
          original.position?.[1] ?? 0,
          original.position?.[2] ?? 0,
        ],
      };
      return {
        models: [...state.models, clone],
        plates: state.plates.map((p) =>
          p.id === state.activePlateId
            ? { ...p, modelIds: [...p.modelIds, newId] }
            : p
        ),
        selectedModelIds: [newId],
        selectedModelId: newId,
      };
    }),
  mirrorModel: (id, axis) =>
    set((state) => {
      const model = state.models.find((m) => m.id === id);
      if (!model) return state;
      const currentScale: [number, number, number] = model.scale ?? [1, 1, 1];
      const axisIndex = axis === 'x' ? 0 : axis === 'y' ? 1 : 2;
      const newScale: [number, number, number] = [...currentScale];
      newScale[axisIndex] = -newScale[axisIndex];
      return {
        models: state.models.map((m) =>
          m.id === id ? { ...m, scale: newScale } : m
        ),
      };
    }),
  arrangeModels: () =>
    set((state) => {
      const activePlate = state.plates.find((p) => p.id === state.activePlateId);
      if (!activePlate) return state;
      const plateModels = state.models.filter((m) => activePlate.modelIds.includes(m.id));
      if (plateModels.length === 0) return state;

      // Get bed dimensions from selected printer profile
      const printer = state.printerProfiles.find((p) => p.id === state.selectedPrinterProfileId);
      const bedWidth = printer?.bedSizeX ?? 220;
      const bedDepth = printer?.bedSizeY ?? 220;

      const positions = arrangeModels2D(plateModels, bedWidth, bedDepth);
      return {
        models: state.models.map((m) => {
          const pos = positions.get(m.id);
          return pos ? { ...m, position: pos } : m;
        }),
      };
    }),

  // Build Plates
  plates: [{ id: 'plate-1', name: 'Plate 1', modelIds: [] }],
  activePlateId: 'plate-1',
  addPlate: () =>
    set((state) => {
      const nextNum = state.plates.length + 1;
      const newPlate: BuildPlateState = {
        id: `plate-${Date.now()}`,
        name: `Plate ${nextNum}`,
        modelIds: [],
      };
      return {
        plates: [...state.plates, newPlate],
        activePlateId: newPlate.id,
      };
    }),
  removePlate: (id) =>
    set((state) => {
      if (state.plates.length <= 1) return state;
      const plate = state.plates.find((p) => p.id === id);
      if (!plate) return state;
      const remaining = state.plates.filter((p) => p.id !== id);
      // Move orphaned models to the first remaining plate
      const target = remaining[0];
      const updated = remaining.map((p) =>
        p.id === target.id
          ? { ...p, modelIds: [...p.modelIds, ...plate.modelIds] }
          : p
      );
      return {
        plates: updated,
        activePlateId:
          state.activePlateId === id ? updated[0].id : state.activePlateId,
      };
    }),
  renamePlate: (id, name) =>
    set((state) => ({
      plates: state.plates.map((p) =>
        p.id === id ? { ...p, name } : p
      ),
    })),
  setActivePlate: (id) => set({ activePlateId: id }),
  moveModelToPlate: (modelId, plateId) =>
    set((state) => ({
      plates: state.plates.map((p) => {
        if (p.modelIds.includes(modelId)) {
          return { ...p, modelIds: p.modelIds.filter((mid) => mid !== modelId) };
        }
        if (p.id === plateId) {
          return { ...p, modelIds: [...p.modelIds, modelId] };
        }
        return p;
      }),
    })),
  updateModel: (id, data) =>
    set((state) => ({
      models: state.models.map((m) => (m.id === id ? { ...m, ...data } : m)),
    })),

  // Profiles (legacy - backward compat)
  profiles: [],
  selectedProfileId: null,
  setProfiles: (profiles) => set({ profiles }),
  selectProfile: (id) => set({ selectedProfileId: id }),

  // Tri-Profile System
  printerProfiles: [],
  filamentProfiles: [],
  processProfiles: [],
  selectedPrinterProfileId: null,
  selectedFilamentProfileId: null,
  selectedProcessProfileId: null,
  setPrinterProfiles: (printerProfiles) => set({ printerProfiles }),
  setFilamentProfiles: (filamentProfiles) => set({ filamentProfiles }),
  setProcessProfiles: (processProfiles) => set({ processProfiles }),
  selectPrinterProfile: (id) => set({ selectedPrinterProfileId: id }),
  selectFilamentProfile: (id) => set({ selectedFilamentProfileId: id }),
  selectProcessProfile: (id) => set({ selectedProcessProfileId: id }),

  // Slicing
  sliceJobs: [],
  activeSliceJobId: null,
  addSliceJob: (job) =>
    set((state) => ({
      sliceJobs: [...state.sliceJobs, job],
      activeSliceJobId: job.id,
    })),
  updateSliceJob: (id, data) =>
    set((state) => ({
      sliceJobs: state.sliceJobs.map((j) =>
        j.id === id ? { ...j, ...data } : j
      ),
    })),

  // Overhang analysis state
  overhangResult: null,
  showOverhangOverlay: false,
  showArcPaths: false,
  setOverhangResult: (result) => set({ overhangResult: result }),
  toggleOverhangOverlay: () =>
    set((state) => ({ showOverhangOverlay: !state.showOverhangOverlay })),
  toggleArcPaths: () =>
    set((state) => ({ showArcPaths: !state.showArcPaths })),

  // Face selection
  faceSelectionEnabled: false,
  selectedFace: null,
  toggleFaceSelection: () =>
    set((state) => ({
      faceSelectionEnabled: !state.faceSelectionEnabled,
      selectedFace: state.faceSelectionEnabled ? null : state.selectedFace,
      toolMode: state.faceSelectionEnabled ? 'select' : 'faceSelect',
    })),
  setSelectedFace: (face) => set({ selectedFace: face }),
  updateModelRotation: (modelId, rotation) =>
    set((state) => ({
      models: state.models.map((m) =>
        m.id === modelId ? { ...m, rotation } : m
      ),
    })),

  // G-code viewer state
  gcodeMode: false,
  gcodeData: null,
  gcodeMetadata: null,
  currentLayer: 0,
  totalLayers: 0,
  gcodeColorMode: 'type' as GcodeColorMode,
  gcodeVisibility: { ...DEFAULT_GCODE_VISIBILITY },
  showRetractions: true,
  setGcodeMode: (mode) => set({ gcodeMode: mode }),
  setGcodeData: (data) =>
    set({
      gcodeData: data,
      totalLayers: data?.layerCount ?? 0,
      currentLayer: data?.layerCount ? data.layerCount - 1 : 0,
    }),
  setGcodeMetadata: (meta) => set({ gcodeMetadata: meta }),
  setCurrentLayer: (layer) => set({ currentLayer: layer }),
  setGcodeColorMode: (mode) => set({ gcodeColorMode: mode }),
  setGcodeVisibility: (visibility) => set({ gcodeVisibility: visibility }),
  toggleMoveTypeVisibility: (moveType) =>
    set((state) => ({
      gcodeVisibility: {
        ...state.gcodeVisibility,
        [moveType]: !state.gcodeVisibility[moveType],
      },
    })),
  setShowRetractions: (show) => set({ showRetractions: show }),

  // Tool mode
  toolMode: 'select' as ToolMode,
  setToolMode: (mode: ToolMode) =>
    set((state) => ({
      toolMode: mode,
      // Sync faceSelectionEnabled with toolMode
      faceSelectionEnabled: mode === 'faceSelect',
      selectedFace: mode === 'faceSelect' ? state.selectedFace : null,
      // Enter paint mode with default sub-mode; exit paint mode when switching away
      paintMode: mode === 'paint' ? (state.paintMode ?? 'support_enforcer') : null,
    })),
  updateModelPosition: (modelId: string, position: [number, number, number]) =>
    set((state) => ({
      models: state.models.map((m) =>
        m.id === modelId ? { ...m, position } : m
      ),
    })),
  updateModelScale: (modelId: string, scale: [number, number, number]) =>
    set((state) => ({
      models: state.models.map((m) =>
        m.id === modelId ? { ...m, scale } : m
      ),
    })),

  // UI State
  leftPanelOpen: true,
  rightPanelOpen: true,
  toggleLeftPanel: () =>
    set((state) => ({ leftPanelOpen: !state.leftPanelOpen })),
  toggleRightPanel: () =>
    set((state) => ({ rightPanelOpen: !state.rightPanelOpen })),
  viewSettings: { wireframe: false, axes: true, grid: true, snap: false },
  toggleViewSetting: (key) =>
    set((state) => ({
      viewSettings: {
        ...state.viewSettings,
        [key]: !state.viewSettings[key],
      },
    })),

  // Per-Object Settings
  perObjectSettings: {},
  heightModifiers: {},
  setPerObjectSettings: (modelId, settings) =>
    set((state) => ({
      perObjectSettings: { ...state.perObjectSettings, [modelId]: settings },
    })),
  clearPerObjectSettings: (modelId) =>
    set((state) => {
      const { [modelId]: _, ...rest } = state.perObjectSettings;
      return { perObjectSettings: rest };
    }),
  addHeightModifier: (modelId, modifier) =>
    set((state) => ({
      heightModifiers: {
        ...state.heightModifiers,
        [modelId]: [...(state.heightModifiers[modelId] ?? []), modifier],
      },
    })),
  removeHeightModifier: (modelId, modifierId) =>
    set((state) => ({
      heightModifiers: {
        ...state.heightModifiers,
        [modelId]: (state.heightModifiers[modelId] ?? []).filter(
          (m) => m.id !== modifierId
        ),
      },
    })),
  updateHeightModifier: (modelId, modifierId, updates) =>
    set((state) => ({
      heightModifiers: {
        ...state.heightModifiers,
        [modelId]: (state.heightModifiers[modelId] ?? []).map((m) =>
          m.id === modifierId ? { ...m, ...updates } : m
        ),
      },
    })),

  // Settings tabs
  activeSettingsTab: "quality",
  setActiveSettingsTab: (tab) => set({ activeSettingsTab: tab }),
  sliceOverrides: {},
  setSliceOverride: (key, value) =>
    set((state) => ({
      sliceOverrides: { ...state.sliceOverrides, [key]: value },
    })),
  setSliceOverrides: (overrides) =>
    set((state) => ({
      sliceOverrides: { ...state.sliceOverrides, ...overrides },
    })),
  resetSliceOverrides: () => set({ sliceOverrides: {} }),

  // Variable Layer Height
  variableLayerProfile: null,
  setVariableLayerProfile: (profile) => set({ variableLayerProfile: profile }),

  // Right panel tab
  rightPanelTab: 'global' as const,
  setRightPanelTab: (tab: 'global' | 'objects' | 'project') => set({ rightPanelTab: tab }),

  // Paint-on supports & seam painting
  paintMode: null,
  paintBrushSize: 3,
  modelPaintData: {},
  setPaintMode: (mode) =>
    set((state) => ({
      paintMode: mode,
      // When entering paint mode, also set toolMode to paint
      toolMode: mode != null ? 'paint' : 'select',
    })),
  setPaintBrushSize: (size) => set({ paintBrushSize: Math.max(1, Math.min(10, size)) }),
  addPaintedFaces: (modelId, mode, faceIndices) =>
    set((state) => {
      const existing = state.modelPaintData[modelId] ?? {
        supportEnforcers: [],
        supportBlockers: [],
        seamPositions: [],
      };
      const key: keyof ModelPaintData =
        mode === 'support_enforcer' ? 'supportEnforcers'
          : mode === 'support_blocker' ? 'supportBlockers'
          : 'seamPositions';
      const currentSet = new Set(existing[key]);
      for (const fi of faceIndices) currentSet.add(fi);
      return {
        modelPaintData: {
          ...state.modelPaintData,
          [modelId]: { ...existing, [key]: Array.from(currentSet) },
        },
      };
    }),
  removePaintedFaces: (modelId, mode, faceIndices) =>
    set((state) => {
      const existing = state.modelPaintData[modelId];
      if (!existing) return state;
      const key: keyof ModelPaintData =
        mode === 'support_enforcer' ? 'supportEnforcers'
          : mode === 'support_blocker' ? 'supportBlockers'
          : 'seamPositions';
      const removeSet = new Set(faceIndices);
      return {
        modelPaintData: {
          ...state.modelPaintData,
          [modelId]: { ...existing, [key]: existing[key].filter((fi) => !removeSet.has(fi)) },
        },
      };
    }),
  clearPaintData: (modelId) =>
    set((state) => {
      const { [modelId]: _, ...rest } = state.modelPaintData;
      return { modelPaintData: rest };
    }),

  // Multi-Material / AMS — per-model filament assignments
  filamentAssignments: {},
  setFilamentAssignment: (modelId, filamentProfileId) =>
    set((state) => ({
      filamentAssignments: { ...state.filamentAssignments, [modelId]: filamentProfileId },
    })),
  clearFilamentAssignment: (modelId) =>
    set((state) => {
      const { [modelId]: _, ...rest } = state.filamentAssignments;
      return { filamentAssignments: rest };
    }),
})));

