"use client";

/**
 * opencad — Toolbar
 *
 * Top action bar. Dumb button rail — parent (the workbench page) wires each
 * action to the Zustand store. Buttons are disabled when the precondition
 * isn't met (e.g. Extrude requires an active sketch).
 */

import {
  Spline,
  Box,
  Cylinder,
  Scissors,
  Circle as CircleIcon,
  Shapes,
  Layers3,
  Download,
  Send,
  Save,
  type LucideIcon,
} from "lucide-react";

export type ToolbarAction =
  | "new-sketch"
  | "extrude"
  | "revolve"
  | "cut"
  | "fillet"
  | "chamfer"
  | "boolean"
  | "save"
  | "export"
  | "handoff-slicer";

export interface ToolbarProps {
  onAction: (action: ToolbarAction) => void;
  hasActiveSketch?: boolean;
  hasSelection?: boolean;
  dirty?: boolean;
  projectName?: string;
  busy?: boolean;
}

interface ButtonSpec {
  id: ToolbarAction;
  label: string;
  icon: LucideIcon;
  group: "sketch" | "solid" | "modify" | "io";
  requires?: "sketch" | "selection" | null;
}

const BUTTONS: ButtonSpec[] = [
  { id: "new-sketch",     label: "New Sketch",  icon: Spline,     group: "sketch" },
  { id: "extrude",        label: "Extrude",     icon: Box,        group: "solid",  requires: "sketch" },
  { id: "revolve",        label: "Revolve",     icon: Cylinder,   group: "solid",  requires: "sketch" },
  { id: "cut",            label: "Cut",         icon: Scissors,   group: "solid",  requires: "sketch" },
  { id: "fillet",         label: "Fillet",      icon: CircleIcon, group: "modify", requires: "selection" },
  { id: "chamfer",        label: "Chamfer",     icon: Shapes,     group: "modify", requires: "selection" },
  { id: "boolean",        label: "Boolean",     icon: Layers3,    group: "modify" },
  { id: "save",           label: "Save",        icon: Save,       group: "io" },
  { id: "export",         label: "Export",      icon: Download,   group: "io" },
  { id: "handoff-slicer", label: "Slicer",      icon: Send,       group: "io" },
];

function Divider() {
  return <span className="mx-1 h-5 w-px bg-neutral-800" aria-hidden />;
}

export function Toolbar({
  onAction,
  hasActiveSketch = false,
  hasSelection = false,
  dirty = false,
  projectName,
  busy = false,
}: ToolbarProps) {
  const isDisabled = (spec: ButtonSpec): boolean => {
    if (busy) return true;
    if (spec.requires === "sketch") return !hasActiveSketch;
    if (spec.requires === "selection") return !hasSelection;
    return false;
  };

  let lastGroup: ButtonSpec["group"] | null = null;

  return (
    <header
      className="flex h-12 w-full shrink-0 items-center gap-1 border-b border-neutral-800 bg-neutral-900 px-3 text-neutral-100"
      role="toolbar"
      aria-label="Workbench actions"
    >
      <div className="mr-3 flex min-w-0 items-center gap-2">
        <span className="truncate text-sm font-semibold">
          {projectName ?? "Untitled"}
        </span>
        {dirty && (
          <span
            className="rounded bg-amber-600/20 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-amber-300"
            aria-label="Unsaved changes"
          >
            Unsaved
          </span>
        )}
      </div>

      <Divider />

      <div className="flex flex-1 items-center gap-1 overflow-x-auto">
        {BUTTONS.map((b) => {
          const showDivider = lastGroup !== null && lastGroup !== b.group;
          lastGroup = b.group;
          const Icon = b.icon;
          const disabled = isDisabled(b);
          return (
            <span key={b.id} className="flex items-center">
              {showDivider && <Divider />}
              <button
                type="button"
                onClick={() => onAction(b.id)}
                disabled={disabled}
                aria-label={b.label}
                title={b.label}
                className={[
                  "flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm transition",
                  disabled
                    ? "cursor-not-allowed text-neutral-600"
                    : "text-neutral-200 hover:bg-neutral-800 hover:text-white",
                ].join(" ")}
              >
                <Icon className="h-4 w-4" aria-hidden />
                <span className="hidden md:inline">{b.label}</span>
              </button>
            </span>
          );
        })}
      </div>

      {busy && (
        <span
          className="ml-2 text-xs text-blue-300"
          role="status"
          aria-live="polite"
        >
          Evaluating…
        </span>
      )}
    </header>
  );
}

export default Toolbar;
