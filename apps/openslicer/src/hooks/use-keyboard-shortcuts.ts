"use client";

import { useEffect } from "react";
import { useSlicerStore } from "../stores/slicer-store";
import { useToastStore } from "../stores/toast-store";
import type { ToolMode } from "../stores/slicer-store";

/**
 * Global keyboard shortcuts for the slicer.
 * Mount once in SlicerLayout — listens on `window`.
 */
export function useKeyboardShortcuts() {
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      // Ignore when typing in inputs / textareas
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

      const ctrl = e.ctrlKey || e.metaKey;
      const shift = e.shiftKey;
      const key = e.key;

      const state = useSlicerStore.getState();
      const addToast = useToastStore.getState().addToast;

      // --- Undo / Redo ---
      if (ctrl && !shift && key === "z") {
        e.preventDefault();
        if (state.canUndo) {
          state.undo();
          addToast({ message: "Undo", type: "info" });
        } else {
          addToast({ message: "Nothing to undo", type: "info" });
        }
        return;
      }
      if (ctrl && shift && (key === "z" || key === "Z")) {
        e.preventDefault();
        if (state.canRedo) {
          state.redo();
          addToast({ message: "Redo", type: "info" });
        } else {
          addToast({ message: "Nothing to redo", type: "info" });
        }
        return;
      }

      // --- Delete selected model(s) ---
      if (key === "Delete" || key === "Backspace") {
        e.preventDefault();
        if (state.selectedModelId) {
          const name = state.models.find((m) => m.id === state.selectedModelId)?.name ?? "Model";
          state.removeModel(state.selectedModelId);
          addToast({ message: `Deleted ${name}`, type: "success" });
        }
        return;
      }

      // --- Escape: clear selection / cancel tool mode ---
      if (key === "Escape") {
        e.preventDefault();
        if (state.toolMode !== "select") {
          state.setToolMode("select");
        } else {
          state.selectModel(null);
        }
        return;
      }

      // --- Duplicate (Ctrl+D) ---
      if (ctrl && (key === "d" || key === "D")) {
        e.preventDefault();
        if (state.selectedModelId) {
          const original = state.models.find((m) => m.id === state.selectedModelId);
          state.duplicateModel(state.selectedModelId);
          if (original) {
            addToast({ message: `Duplicated ${original.name}`, type: "success" });
          }
        }
        return;
      }

      // --- Select All (Ctrl+A) ---
      if (ctrl && (key === "a" || key === "A")) {
        e.preventDefault();
        state.selectAllModels();
        addToast({ message: `${state.models.length} model(s) selected`, type: "info" });
        return;
      }

      // --- Tool mode shortcuts (single key, no modifier) ---
      if (!ctrl && !shift && !e.altKey) {
        const toolMap: Record<string, ToolMode> = {
          q: "select",
          w: "move",
          e: "rotate",
          r: "scale",
        };
        const mode = toolMap[key.toLowerCase()];
        if (mode) {
          e.preventDefault();
          state.setToolMode(mode);
          return;
        }
      }
    }

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);
}
