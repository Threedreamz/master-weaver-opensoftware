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
  Triangle,
  Cone,
  Circle,
  Square,
  Hexagon,
  MoveHorizontal,
  RotateCcw,
  Maximize2,
  FlipHorizontal,
  Grid3x3,
  CircleDot,
  Waves,
  Layers,
  Target,
  Wrench,
  Pickaxe,
  GitCommitHorizontal,
  GitBranch,
  FileStack,
  type LucideIcon,
} from "lucide-react";

export type ToolbarAction =
  | "new-sketch"
  // primitives
  | "box"
  | "cylinder"
  | "sphere"
  | "cone"
  | "torus"
  | "pyramid"
  // sketch entities
  | "sketch-rectangle"
  | "sketch-polygon"
  | "sketch-ellipse"
  | "sketch-slot"
  | "sketch-offset"
  | "sketch-trim"
  | "sketch-fillet"
  // solid features
  | "extrude"
  | "revolve"
  | "sweep"
  | "loft"
  | "cut"
  | "fillet"
  | "chamfer"
  | "shell"
  | "draft"
  | "hole"
  | "thread"
  // patterns + transforms
  | "mirror"
  | "pattern-linear"
  | "pattern-circular"
  | "transform"
  | "group"
  // booleans
  | "boolean"
  | "boolean-union"
  | "boolean-subtract"
  | "boolean-intersect"
  // io
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
  group:
    | "sketch-entity"
    | "sketch-tool"
    | "sketch"
    | "primitive"
    | "solid"
    | "modify"
    | "pattern"
    | "transform"
    | "boolean"
    | "io";
  requires?: "sketch" | "selection" | null;
}

const BUTTONS: ButtonSpec[] = [
  // Sketch mode
  { id: "new-sketch",        label: "Sketch",     icon: Spline,            group: "sketch" },
  // Sketch entities (active when in sketch mode)
  { id: "sketch-rectangle",  label: "Rectangle",  icon: Square,            group: "sketch-entity", requires: "sketch" },
  { id: "sketch-polygon",    label: "Polygon",    icon: Hexagon,           group: "sketch-entity", requires: "sketch" },
  { id: "sketch-ellipse",    label: "Ellipse",    icon: Circle,            group: "sketch-entity", requires: "sketch" },
  { id: "sketch-slot",       label: "Slot",       icon: GitCommitHorizontal, group: "sketch-entity", requires: "sketch" },
  // Sketch tools
  { id: "sketch-offset",     label: "Offset",     icon: Waves,             group: "sketch-tool",   requires: "sketch" },
  { id: "sketch-trim",       label: "Trim",       icon: Scissors,          group: "sketch-tool",   requires: "sketch" },
  { id: "sketch-fillet",     label: "Fillet 2D",  icon: CircleIcon,        group: "sketch-tool",   requires: "sketch" },
  // Primitives
  { id: "box",               label: "Box",        icon: Box,               group: "primitive" },
  { id: "cylinder",          label: "Cylinder",   icon: Cylinder,          group: "primitive" },
  { id: "sphere",            label: "Sphere",     icon: Circle,            group: "primitive" },
  { id: "cone",              label: "Cone",       icon: Cone,              group: "primitive" },
  { id: "torus",             label: "Torus",      icon: CircleDot,         group: "primitive" },
  { id: "pyramid",           label: "Pyramid",    icon: Triangle,          group: "primitive" },
  // Solid features
  { id: "extrude",           label: "Extrude",    icon: Box,               group: "solid",  requires: "sketch" },
  { id: "revolve",           label: "Revolve",    icon: Cylinder,          group: "solid",  requires: "sketch" },
  { id: "sweep",             label: "Sweep",      icon: GitBranch,         group: "solid",  requires: "sketch" },
  { id: "loft",              label: "Loft",       icon: Layers,            group: "solid",  requires: "sketch" },
  { id: "cut",               label: "Cut",        icon: Scissors,          group: "solid",  requires: "sketch" },
  { id: "hole",              label: "Hole",       icon: Target,            group: "solid",  requires: "selection" },
  { id: "thread",            label: "Thread",     icon: Wrench,            group: "solid",  requires: "selection" },
  // Modifiers
  { id: "fillet",            label: "Fillet",     icon: CircleIcon,        group: "modify", requires: "selection" },
  { id: "chamfer",           label: "Chamfer",    icon: Shapes,            group: "modify", requires: "selection" },
  { id: "shell",             label: "Shell",      icon: Pickaxe,           group: "modify", requires: "selection" },
  { id: "draft",             label: "Draft",      icon: Shapes,            group: "modify", requires: "selection" },
  // Patterns + transforms
  { id: "mirror",            label: "Mirror",     icon: FlipHorizontal,    group: "pattern", requires: "selection" },
  { id: "pattern-linear",    label: "Pattern L",  icon: Grid3x3,           group: "pattern", requires: "selection" },
  { id: "pattern-circular",  label: "Pattern C",  icon: RotateCcw,         group: "pattern", requires: "selection" },
  { id: "transform",         label: "Transform",  icon: MoveHorizontal,    group: "transform", requires: "selection" },
  { id: "group",             label: "Group",      icon: FileStack,         group: "transform" },
  // Booleans
  { id: "boolean-union",     label: "Union",      icon: Layers3,           group: "boolean" },
  { id: "boolean-subtract",  label: "Subtract",   icon: Layers3,           group: "boolean" },
  { id: "boolean-intersect", label: "Intersect",  icon: Layers3,           group: "boolean" },
  // IO
  { id: "save",              label: "Save",       icon: Save,              group: "io" },
  { id: "export",            label: "Export",     icon: Download,          group: "io" },
  { id: "handoff-slicer",    label: "Slicer",     icon: Send,              group: "io" },
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
