import { create } from "zustand";
import type { Node, Edge } from "@xyflow/react";
import type { FlowDefinition } from "@opensoftware/openflow-core";

const MAX_HISTORY = 20;

interface EditorState {
  flow: FlowDefinition | null;
  nodes: Node[];
  edges: Edge[];
  selectedNodeId: string | null;
  selectedComponentId: string | null;
  isDirty: boolean;
  isSaving: boolean;

  // Undo/Redo
  history: string[];
  redoStack: string[];

  setFlow: (flow: FlowDefinition) => void;
  setNodes: (nodes: Node[]) => void;
  setEdges: (edges: Edge[]) => void;
  selectNode: (id: string | null) => void;
  selectComponent: (id: string | null) => void;
  markDirty: () => void;
  markSaved: () => void;
  pushHistory: (state: FlowDefinition) => void;
  undo: () => FlowDefinition | null;
  redo: () => FlowDefinition | null;
}

export const useEditorStore = create<EditorState>((set, get) => ({
  flow: null,
  nodes: [],
  edges: [],
  selectedNodeId: null,
  selectedComponentId: null,
  isDirty: false,
  isSaving: false,
  history: [],
  redoStack: [],

  setFlow: (flow) => set({ flow }),
  setNodes: (nodes) => set({ nodes }),
  setEdges: (edges) => set({ edges }),
  selectNode: (id) => set({ selectedNodeId: id }),
  selectComponent: (id) => set({ selectedComponentId: id }),
  markDirty: () => set({ isDirty: true }),
  markSaved: () => set({ isDirty: false, isSaving: false }),

  pushHistory: (state: FlowDefinition) => {
    const snapshot = JSON.stringify(state);
    set((s) => ({
      history: [...s.history.slice(-(MAX_HISTORY - 1)), snapshot],
      redoStack: [],
    }));
  },

  undo: () => {
    const { history, flow } = get();
    if (history.length === 0 || !flow) return null;
    const currentSnapshot = JSON.stringify(flow);
    const previous = history[history.length - 1]!;
    set((s) => ({
      history: s.history.slice(0, -1),
      redoStack: [...s.redoStack, currentSnapshot],
    }));
    return JSON.parse(previous) as FlowDefinition;
  },

  redo: () => {
    const { redoStack, flow } = get();
    if (redoStack.length === 0 || !flow) return null;
    const currentSnapshot = JSON.stringify(flow);
    const next = redoStack[redoStack.length - 1]!;
    set((s) => ({
      redoStack: s.redoStack.slice(0, -1),
      history: [...s.history, currentSnapshot],
    }));
    return JSON.parse(next) as FlowDefinition;
  },
}));
