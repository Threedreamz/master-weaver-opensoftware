"use client";

import { useState, useRef, useEffect } from "react";
import { useSlicerStore } from "../../stores/slicer-store";
import { getFilamentColor } from "../../lib/filament-colors";

function formatPrintTime(seconds: number): string {
  if (seconds <= 0) return "";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export function PlateTabBar() {
  const {
    plates,
    activePlateId,
    addPlate,
    removePlate,
    renamePlate,
    setActivePlate,
    filamentProfiles,
    gcodeMode,
    setGcodeMode,
    gcodeData,
    gcodeMetadata,
  } = useSlicerStore();

  const [contextMenu, setContextMenu] = useState<{
    plateId: string;
    x: number;
    y: number;
  } | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const renameInputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Focus rename input when it appears
  useEffect(() => {
    if (renamingId && renameInputRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [renamingId]);

  // Close context menu on outside click
  useEffect(() => {
    if (!contextMenu) return;
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setContextMenu(null);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [contextMenu]);

  const handleContextMenu = (
    e: React.MouseEvent,
    plateId: string
  ) => {
    e.preventDefault();
    setContextMenu({ plateId, x: e.clientX, y: e.clientY });
  };

  const handleRenameStart = (plateId: string) => {
    const plate = plates.find((p) => p.id === plateId);
    if (plate) {
      setRenamingId(plateId);
      setRenameValue(plate.name);
    }
    setContextMenu(null);
  };

  const handleRenameConfirm = () => {
    if (renamingId && renameValue.trim()) {
      renamePlate(renamingId, renameValue.trim());
    }
    setRenamingId(null);
  };

  const handleDelete = (plateId: string) => {
    removePlate(plateId);
    setContextMenu(null);
  };

  const hasSliceResult = !!gcodeData;

  return (
    <div className="flex h-8 shrink-0 items-center gap-0.5 border-t border-zinc-800 bg-zinc-900 px-2">
      {/* Plate tabs (left) */}
      {plates.map((plate) => {
        const isActive = plate.id === activePlateId;
        const modelCount = plate.modelIds.length;

        return (
          <button
            key={plate.id}
            onClick={() => setActivePlate(plate.id)}
            onContextMenu={(e) => handleContextMenu(e, plate.id)}
            className={`flex items-center gap-1.5 rounded-t-md px-3 py-1 text-xs font-medium transition-colors ${
              isActive
                ? "bg-indigo-600/30 text-indigo-300 border-b-2 border-indigo-500"
                : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-300"
            }`}
          >
            {renamingId === plate.id ? (
              <input
                ref={renameInputRef}
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onBlur={handleRenameConfirm}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleRenameConfirm();
                  if (e.key === "Escape") setRenamingId(null);
                }}
                className="w-20 bg-transparent text-xs text-zinc-200 outline-none border-b border-indigo-400"
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <span>{plate.name}</span>
            )}
            {modelCount > 0 && (
              <span
                className={`inline-flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 text-[10px] font-bold ${
                  isActive
                    ? "bg-indigo-500/40 text-indigo-200"
                    : "bg-zinc-700 text-zinc-400"
                }`}
              >
                {modelCount}
              </span>
            )}
          </button>
        );
      })}

      {/* Add plate button */}
      <button
        onClick={addPlate}
        className="ml-1 flex h-6 w-6 items-center justify-center rounded text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-300"
        title="Add build plate"
      >
        +
      </button>

      {/* AMS Filament Strip (center) */}
      {filamentProfiles.length > 0 && (
        <>
          <div className="mx-2 h-4 w-px bg-zinc-700" />
          <div className="flex items-center gap-1">
            {filamentProfiles.map((fp, idx) => {
              const color = getFilamentColor(fp.materialType);
              const label = fp.name + (fp.nozzleTemp ? ` (${fp.nozzleTemp}\u00B0C)` : "");
              return (
                <div
                  key={fp.id}
                  className="group relative flex items-center"
                  title={label}
                >
                  <span
                    className="inline-block h-4 w-4 rounded-full ring-1 ring-white/20 cursor-default"
                    style={{ backgroundColor: color }}
                  />
                  {/* Tooltip on hover */}
                  <div className="pointer-events-none absolute bottom-full left-1/2 mb-1.5 -translate-x-1/2 whitespace-nowrap rounded bg-zinc-700 px-2 py-1 text-[10px] text-zinc-200 opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
                    <span className="font-medium">T{idx}</span>{" "}
                    {fp.name}
                    {fp.nozzleTemp != null && (
                      <span className="ml-1 text-zinc-400">{fp.nozzleTemp}&deg;C</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* 3D / Preview toggle (right-center) */}
      <div className="flex items-center rounded-md bg-zinc-800 ring-1 ring-zinc-700 overflow-hidden">
        <button
          onClick={() => setGcodeMode(false)}
          className={`px-3 py-1 text-[11px] font-semibold transition-colors ${
            !gcodeMode
              ? "bg-indigo-600 text-white"
              : "text-zinc-400 hover:text-zinc-200"
          }`}
        >
          3D
        </button>
        <button
          onClick={() => hasSliceResult && setGcodeMode(true)}
          disabled={!hasSliceResult}
          title={hasSliceResult ? "Preview G-code toolpath" : "Slice first to preview"}
          className={`px-3 py-1 text-[11px] font-semibold transition-colors ${
            gcodeMode
              ? "bg-indigo-600 text-white"
              : hasSliceResult
                ? "text-zinc-400 hover:text-zinc-200"
                : "text-zinc-600 cursor-not-allowed"
          }`}
        >
          Preview
        </button>
      </div>

      {/* Print stats (right, only after slicing) */}
      {gcodeMetadata && (
        <div className="ml-3 flex items-center gap-2 text-[10px] text-zinc-400">
          {gcodeMetadata.estimatedTime != null && gcodeMetadata.estimatedTime > 0 && (
            <span className="font-mono">{formatPrintTime(gcodeMetadata.estimatedTime)}</span>
          )}
          {gcodeMetadata.filamentUsedGrams != null && (
            <span className="font-mono">{gcodeMetadata.filamentUsedGrams.toFixed(1)}g</span>
          )}
        </div>
      )}

      {/* Context menu */}
      {contextMenu && (
        <div
          ref={menuRef}
          className="fixed z-50 min-w-[120px] rounded-md border border-zinc-700 bg-zinc-800 py-1 shadow-xl"
          style={{ left: contextMenu.x, top: contextMenu.y - 80 }}
        >
          <button
            onClick={() => handleRenameStart(contextMenu.plateId)}
            className="flex w-full items-center px-3 py-1.5 text-xs text-zinc-300 hover:bg-zinc-700"
          >
            Rename
          </button>
          {plates.length > 1 && (
            <button
              onClick={() => handleDelete(contextMenu.plateId)}
              className="flex w-full items-center px-3 py-1.5 text-xs text-red-400 hover:bg-zinc-700"
            >
              Delete
            </button>
          )}
        </div>
      )}
    </div>
  );
}
