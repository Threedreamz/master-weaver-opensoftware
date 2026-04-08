"use client";

import type { StateCreator, StoreMutatorIdentifier } from "zustand";
import type {
  SlicerModel,
  BuildPlateState,
  ProcessOverrides,
  HeightRangeModifier,
} from "./slicer-store";

// --- Tracked state shape (only these fields are recorded for undo) ---

export interface TrackedState {
  models: SlicerModel[];
  selectedModelIds: string[];
  selectedModelId: string | null;
  perObjectSettings: Record<string, ProcessOverrides>;
  heightModifiers: Record<string, HeightRangeModifier[]>;
  plates: BuildPlateState[];
  sliceOverrides: ProcessOverrides;
}

const TRACKED_KEYS: (keyof TrackedState)[] = [
  "models",
  "selectedModelIds",
  "selectedModelId",
  "perObjectSettings",
  "heightModifiers",
  "plates",
  "sliceOverrides",
];

const MAX_HISTORY = 50;

// --- Undo state injected into the store ---

export interface UndoState {
  _undo_past: Partial<TrackedState>[];
  _undo_future: Partial<TrackedState>[];
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

// --- Helpers ---

function pickTracked(state: Record<string, unknown>): Partial<TrackedState> {
  const snap: Record<string, unknown> = {};
  for (const key of TRACKED_KEYS) {
    if (key in state) {
      snap[key] = state[key];
    }
  }
  return snap as Partial<TrackedState>;
}

function trackedChanged(
  prev: Partial<TrackedState>,
  next: Partial<TrackedState>,
): boolean {
  for (const key of TRACKED_KEYS) {
    const a = prev[key];
    const b = next[key];
    if (a === b) continue;
    // Fast path: different reference — do a JSON comparison
    if (JSON.stringify(a) !== JSON.stringify(b)) return true;
  }
  return false;
}

// --- Middleware ---

type UndoMiddleware = <
  T extends object,
  Mps extends [StoreMutatorIdentifier, unknown][] = [],
  Mcs extends [StoreMutatorIdentifier, unknown][] = [],
>(
  creator: StateCreator<T, Mps, Mcs>,
) => StateCreator<T & UndoState, Mps, Mcs>;

type UndoMiddlewareImpl = <T extends object>(
  creator: StateCreator<T, [], []>,
) => StateCreator<T & UndoState, [], []>;

const undoMiddlewareImpl: UndoMiddlewareImpl = (creator) => (set, get, api) => {
  // Flag to suppress recording when undo/redo themselves call set
  let skipRecord = false;

  const wrappedSet: typeof set = (partial, replace) => {
    if (skipRecord) {
      (set as Function)(partial, replace);
      return;
    }

    // Snapshot BEFORE the mutation
    const before = pickTracked(get() as Record<string, unknown>);

    // Apply the mutation
    (set as Function)(partial, replace);

    // Snapshot AFTER the mutation
    const after = pickTracked(get() as Record<string, unknown>);

    // Only record if tracked state actually changed
    if (!trackedChanged(before, after)) return;

    const currentState = get() as Record<string, unknown> & UndoState;
    const past = [...currentState._undo_past, before].slice(-MAX_HISTORY);

    skipRecord = true;
    (set as Function)({
      _undo_past: past,
      _undo_future: [] as Partial<TrackedState>[],
      canUndo: past.length > 0,
      canRedo: false,
    });
    skipRecord = false;
  };

  // Create the original store state using wrapped set
  const initialState = creator(wrappedSet, get, api);

  return {
    ...initialState,

    // Undo/redo stacks
    _undo_past: [] as Partial<TrackedState>[],
    _undo_future: [] as Partial<TrackedState>[],
    canUndo: false,
    canRedo: false,

    undo: () => {
      const state = get() as Record<string, unknown> & UndoState;
      const past = [...state._undo_past];
      if (past.length === 0) return;

      const snapshot = past.pop()!;
      const current = pickTracked(state as Record<string, unknown>);
      const future = [...state._undo_future, current];

      skipRecord = true;
      (set as Function)({
        ...snapshot,
        _undo_past: past,
        _undo_future: future,
        canUndo: past.length > 0,
        canRedo: future.length > 0,
      });
      skipRecord = false;
    },

    redo: () => {
      const state = get() as Record<string, unknown> & UndoState;
      const future = [...state._undo_future];
      if (future.length === 0) return;

      const snapshot = future.pop()!;
      const current = pickTracked(state as Record<string, unknown>);
      const past = [...state._undo_past, current];

      skipRecord = true;
      (set as Function)({
        ...snapshot,
        _undo_past: past,
        _undo_future: future,
        canUndo: past.length > 0,
        canRedo: future.length > 0,
      });
      skipRecord = false;
    },
  };
};

export const undoMiddleware = undoMiddlewareImpl as unknown as UndoMiddleware;
