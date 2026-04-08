"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useSlicerStore } from "../../stores/slicer-store";
import { useToastStore } from "../../stores/toast-store";

interface MenuPosition {
  x: number;
  y: number;
}

interface ContextMenuProps {
  /** The DOM element to listen for right-click on (usually the viewport wrapper) */
  containerRef: React.RefObject<HTMLDivElement | null>;
}

interface MenuItem {
  label: string;
  shortcut?: string;
  action: () => void;
  disabled?: boolean;
}

export function ContextMenu({ containerRef }: ContextMenuProps) {
  const [position, setPosition] = useState<MenuPosition | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const selectedModelId = useSlicerStore((s) => s.selectedModelId);
  const models = useSlicerStore((s) => s.models);
  const removeModel = useSlicerStore.getState().removeModel;
  const addModel = useSlicerStore.getState().addModel;
  const selectModel = useSlicerStore.getState().selectModel;
  const updateModelPosition = useSlicerStore.getState().updateModelPosition;
  const addToast = useToastStore.getState().addToast;

  const close = useCallback(() => setPosition(null), []);

  // Open on right-click
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    function onContextMenu(e: MouseEvent) {
      e.preventDefault();
      setPosition({ x: e.clientX, y: e.clientY });
    }

    el.addEventListener("contextmenu", onContextMenu);
    return () => el.removeEventListener("contextmenu", onContextMenu);
  }, [containerRef]);

  // Close on outside click or Escape
  useEffect(() => {
    if (!position) return;

    function onClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        close();
      }
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        close();
      }
    }

    document.addEventListener("mousedown", onClickOutside);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [position, close]);

  if (!position) return null;

  const selectedModel = models.find((m) => m.id === selectedModelId);
  const hasSelection = !!selectedModel;

  const items: MenuItem[] = [
    {
      label: "Delete",
      shortcut: "Del",
      disabled: !hasSelection,
      action: () => {
        if (selectedModelId) {
          const name = selectedModel?.name ?? "Model";
          removeModel(selectedModelId);
          addToast({ message: `Deleted ${name}`, type: "success" });
        }
        close();
      },
    },
    {
      label: "Duplicate",
      shortcut: "Ctrl+D",
      disabled: !hasSelection,
      action: () => {
        if (selectedModel) {
          const clone = {
            ...selectedModel,
            id: `${selectedModel.id}-dup-${Date.now()}`,
            name: `${selectedModel.name} (copy)`,
            position: selectedModel.position
              ? [selectedModel.position[0] + 20, selectedModel.position[1], selectedModel.position[2]] as [number, number, number]
              : [20, 0, 0] as [number, number, number],
          };
          addModel(clone);
          selectModel(clone.id);
          addToast({ message: `Duplicated ${selectedModel.name}`, type: "success" });
        }
        close();
      },
    },
    {
      label: "Center on Bed",
      disabled: !hasSelection,
      action: () => {
        if (selectedModelId) {
          updateModelPosition(selectedModelId, [0, 0, 0]);
          addToast({ message: "Centered on bed", type: "success" });
        }
        close();
      },
    },
    {
      label: "Per-Object Settings",
      disabled: !hasSelection,
      action: () => {
        if (hasSelection) {
          addToast({ message: "Per-object settings: select model and use right panel", type: "info" });
        }
        close();
      },
    },
  ];

  // Adjust position so menu doesn't overflow viewport
  const menuWidth = 200;
  const menuHeight = items.length * 36 + 8;
  const x = Math.min(position.x, window.innerWidth - menuWidth - 8);
  const y = Math.min(position.y, window.innerHeight - menuHeight - 8);

  return (
    <div
      ref={menuRef}
      className="fixed z-50 min-w-[180px] rounded-lg border border-zinc-700 bg-zinc-800 py-1 shadow-xl"
      style={{ left: x, top: y }}
    >
      {items.map((item) => (
        <button
          key={item.label}
          onClick={item.action}
          disabled={item.disabled}
          className="flex w-full items-center justify-between px-3 py-2 text-left text-sm text-zinc-200 transition-colors hover:bg-zinc-700 disabled:cursor-not-allowed disabled:text-zinc-500"
        >
          <span>{item.label}</span>
          {item.shortcut && (
            <span className="ml-4 text-[10px] text-zinc-500">{item.shortcut}</span>
          )}
        </button>
      ))}
    </div>
  );
}
