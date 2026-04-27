"use client";

import { ChevronDown, ChevronUp, X } from "lucide-react";
import { useCamStore, useToolById } from "@/stores/cam-store";

const KIND_COLORS: Record<string, string> = {
  pocket: "#3b82f6",
  contour: "#22c55e",
  face: "#f59e0b",
  drill: "#ef4444",
  adaptive: "#a855f7",
  "3d-parallel": "#06b6d4",
};

export function OperationTree() {
  const operations = useCamStore((s) => s.operations);
  const selectedId = useCamStore((s) => s.selectedOperationId);
  const selectOperation = useCamStore((s) => s.selectOperation);
  const deleteOperation = useCamStore((s) => s.deleteOperation);
  const updateOperation = useCamStore((s) => s.updateOperation);

  const onReorder = async (id: string, dir: -1 | 1) => {
    const idx = operations.findIndex((o) => o.id === id);
    if (idx < 0) return;
    const neighbor = operations[idx + dir];
    if (!neighbor) return;
    // reorder — defer full persistence to M2; issue sortOrder swap if route accepts it
    try {
      await updateOperation(id, { sortOrder: neighbor.sortOrder } as never);
      await updateOperation(neighbor.id, { sortOrder: operations[idx].sortOrder } as never);
    } catch {
      /* M2: backend sortOrder support — ignore for M1 */
    }
  };

  return (
    <div className="flex flex-col">
      <div className="border-b border-neutral-800 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-neutral-400">
        Operations ({operations.length})
      </div>
      {operations.length === 0 ? (
        <div className="px-3 py-4 text-xs text-neutral-500">
          No operations yet. Click "+ Add operation" in the toolbar.
        </div>
      ) : (
        <ul className="flex flex-col">
          {operations.map((op, idx) => (
            <OperationRow
              key={op.id}
              index={idx}
              lastIndex={operations.length - 1}
              opId={op.id}
              kind={op.kind}
              toolId={op.toolId}
              feedMmMin={op.feedMmMin}
              spindleRpm={op.spindleRpm}
              selected={op.id === selectedId}
              onSelect={() => selectOperation(op.id)}
              onDelete={() => void deleteOperation(op.id)}
              onUp={() => void onReorder(op.id, -1)}
              onDown={() => void onReorder(op.id, 1)}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function OperationRow({
  index,
  lastIndex,
  opId,
  kind,
  toolId,
  feedMmMin,
  spindleRpm,
  selected,
  onSelect,
  onDelete,
  onUp,
  onDown,
}: {
  index: number;
  lastIndex: number;
  opId: string;
  kind: string;
  toolId: string;
  feedMmMin: number;
  spindleRpm: number;
  selected: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onUp: () => void;
  onDown: () => void;
}) {
  const tool = useToolById(toolId);
  const color = KIND_COLORS[kind] ?? "#9ca3af";

  return (
    <li
      className={`flex items-center gap-2 border-b border-neutral-800 px-2 py-2 text-xs ${
        selected ? "bg-neutral-800" : "hover:bg-neutral-850"
      }`}
    >
      <button
        type="button"
        onClick={onSelect}
        className="flex min-w-0 flex-1 items-center gap-2 text-left"
      >
        <span
          className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
          style={{ backgroundColor: color }}
          aria-hidden
        />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-neutral-100">
            {kind} · {tool?.name ?? "(no tool)"}
          </span>
          <span className="block truncate text-[10px] text-neutral-500">
            F{feedMmMin} S{spindleRpm}
            {tool ? ` · Ø${tool.diameterMm}` : ""}
          </span>
        </span>
      </button>
      <div className="flex flex-col">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onUp();
          }}
          disabled={index === 0}
          title="Move up"
          className="p-0.5 text-neutral-500 hover:text-neutral-100 disabled:opacity-30"
        >
          <ChevronUp className="h-3 w-3" />
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDown();
          }}
          disabled={index === lastIndex}
          title="Move down"
          className="p-0.5 text-neutral-500 hover:text-neutral-100 disabled:opacity-30"
        >
          <ChevronDown className="h-3 w-3" />
        </button>
      </div>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          if (window.confirm(`Delete operation ${opId}?`)) onDelete();
        }}
        title="Delete"
        className="rounded p-1 text-neutral-500 hover:bg-red-950 hover:text-red-300"
      >
        <X className="h-3 w-3" />
      </button>
    </li>
  );
}
