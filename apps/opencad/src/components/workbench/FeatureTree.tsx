"use client";

/**
 * opencad — FeatureTree
 *
 * Left sidebar listing features in evaluation order. Supports:
 *  - Click to select (drives PropertiesPanel and Viewport highlight)
 *  - Edit icon (rename / expose as parametric)
 *  - Delete icon
 *  - Native HTML5 drag-and-drop to reorder (the reorder event bubbles up
 *    to the store via props.onReorder; the store then triggers re-evaluate)
 */

import { useRef, useState } from "react";
import {
  Box,
  Cylinder,
  Circle as CircleIcon,
  Pencil,
  Trash2,
  Shapes,
  Scissors,
  Spline,
  Layers3,
  Download,
  GripVertical,
  type LucideIcon,
} from "lucide-react";

export type FeatureKind =
  | "sketch"
  | "extrude"
  | "revolve"
  | "cut"
  | "fillet"
  | "chamfer"
  | "boolean"
  | "import"
  | string;

export interface FeatureTreeNode {
  id: string;
  kind: FeatureKind;
  name?: string;
  suppressed?: boolean;
  error?: string | null;
}

export interface FeatureTreeProps {
  features: FeatureTreeNode[];
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  onReorder?: (fromId: string, toId: string) => void;
}

const KIND_ICON: Record<string, LucideIcon> = {
  sketch: Spline,
  extrude: Box,
  revolve: Cylinder,
  cut: Scissors,
  fillet: CircleIcon,
  chamfer: Shapes,
  boolean: Layers3,
  import: Download,
};

function iconFor(kind: FeatureKind): LucideIcon {
  return KIND_ICON[kind] ?? Shapes;
}

export function FeatureTree({
  features,
  selectedId = null,
  onSelect,
  onEdit,
  onDelete,
  onReorder,
}: FeatureTreeProps) {
  const dragId = useRef<string | null>(null);
  const [hoverId, setHoverId] = useState<string | null>(null);

  return (
    <aside
      className="flex h-full w-64 shrink-0 flex-col border-r border-neutral-800 bg-neutral-900 text-neutral-100"
      aria-label="Feature tree"
    >
      <header className="flex h-10 items-center justify-between border-b border-neutral-800 px-3 text-xs font-semibold uppercase tracking-wider text-neutral-400">
        <span>Feature Tree</span>
        <span className="rounded bg-neutral-800 px-1.5 py-0.5 text-[10px] text-neutral-300">
          {features.length}
        </span>
      </header>

      <ul className="flex-1 overflow-y-auto py-1" role="tree">
        {features.length === 0 && (
          <li className="px-3 py-6 text-center text-xs text-neutral-500">
            No features yet. Use the toolbar to add a sketch or import a model.
          </li>
        )}

        {features.map((f, idx) => {
          const Icon = iconFor(f.kind);
          const selected = selectedId === f.id;
          const dragTarget = hoverId === f.id;

          return (
            <li
              key={f.id}
              role="treeitem"
              aria-selected={selected}
              draggable
              onDragStart={() => {
                dragId.current = f.id;
              }}
              onDragOver={(e) => {
                e.preventDefault();
                if (dragId.current && dragId.current !== f.id) setHoverId(f.id);
              }}
              onDragLeave={() => {
                if (hoverId === f.id) setHoverId(null);
              }}
              onDrop={(e) => {
                e.preventDefault();
                const from = dragId.current;
                if (from && from !== f.id) onReorder?.(from, f.id);
                dragId.current = null;
                setHoverId(null);
              }}
              onDragEnd={() => {
                dragId.current = null;
                setHoverId(null);
              }}
              className={[
                "group relative flex cursor-pointer items-center gap-2 border-l-2 px-3 py-1.5 text-sm",
                selected
                  ? "border-blue-500 bg-blue-950/40"
                  : "border-transparent hover:bg-neutral-800/60",
                dragTarget ? "ring-1 ring-blue-500" : "",
                f.suppressed ? "opacity-50" : "",
              ].join(" ")}
              onClick={() => onSelect?.(f.id)}
            >
              <GripVertical
                className="h-3.5 w-3.5 shrink-0 text-neutral-600 opacity-0 transition group-hover:opacity-100"
                aria-hidden
              />
              <Icon
                className={`h-4 w-4 shrink-0 ${
                  f.error ? "text-red-400" : "text-neutral-300"
                }`}
                aria-hidden
              />
              <div className="min-w-0 flex-1">
                <div className="truncate text-neutral-100">
                  {f.name ?? `${f.kind}-${idx + 1}`}
                </div>
                <div className="truncate text-[10px] uppercase tracking-wide text-neutral-500">
                  {f.kind}
                  {f.error ? ` — ${f.error}` : ""}
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition group-hover:opacity-100">
                <button
                  type="button"
                  aria-label={`Edit ${f.name ?? f.kind}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit?.(f.id);
                  }}
                  className="rounded p-1 text-neutral-400 hover:bg-neutral-700 hover:text-neutral-100"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  aria-label={`Delete ${f.name ?? f.kind}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete?.(f.id);
                  }}
                  className="rounded p-1 text-neutral-400 hover:bg-red-900/60 hover:text-red-200"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}

export default FeatureTree;
