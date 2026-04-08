"use client";

import {
  MousePointer,
  Move,
  RotateCcw,
  Maximize2,
  Ruler,
  Sparkles,
  Paintbrush,
  Scissors,
} from "lucide-react";
import { useSlicerStore } from "../../stores/slicer-store";
import type { ToolMode } from "../../stores/slicer-store";

interface ToolButton {
  mode: ToolMode;
  icon: React.ReactNode;
  title: string;
}

const transformTools: ToolButton[] = [
  { mode: "select", icon: <MousePointer size={18} />, title: "Select" },
  { mode: "move", icon: <Move size={18} />, title: "Move" },
  { mode: "rotate", icon: <RotateCcw size={18} />, title: "Rotate" },
  { mode: "scale", icon: <Maximize2 size={18} />, title: "Scale" },
];

const utilityTools: ToolButton[] = [
  { mode: "measure", icon: <Ruler size={18} />, title: "Measure" },
  { mode: "faceSelect", icon: <Sparkles size={18} />, title: "Face Select" },
  { mode: "paint", icon: <Paintbrush size={18} />, title: "Paint" },
  { mode: "cut", icon: <Scissors size={18} />, title: "Cut" },
];

export function ViewportToolStrip() {
  const toolMode = useSlicerStore((s) => s.toolMode);
  const setToolMode = useSlicerStore((s) => s.setToolMode);

  const handleClick = (mode: ToolMode) => {
    setToolMode(toolMode === mode ? "select" : mode);
  };

  return (
    <div className="absolute right-3 top-3 z-10 flex flex-col gap-1">
      {transformTools.map((tool) => (
        <button
          key={tool.mode}
          onClick={() => handleClick(tool.mode)}
          title={tool.title}
          className={`flex h-9 w-9 items-center justify-center rounded-lg backdrop-blur-sm transition-all ${
            toolMode === tool.mode
              ? "bg-indigo-600 text-white shadow-sm shadow-indigo-500/30"
              : "bg-zinc-800/80 text-zinc-400 hover:bg-zinc-700/90 hover:text-zinc-200"
          }`}
        >
          {tool.icon}
        </button>
      ))}

      {/* Separator */}
      <div className="mx-auto my-0.5 h-px w-5 bg-zinc-600/60" />

      {utilityTools.map((tool) => (
        <button
          key={tool.mode}
          onClick={() => handleClick(tool.mode)}
          title={tool.title}
          className={`flex h-9 w-9 items-center justify-center rounded-lg backdrop-blur-sm transition-all ${
            toolMode === tool.mode
              ? "bg-indigo-600 text-white shadow-sm shadow-indigo-500/30"
              : "bg-zinc-800/80 text-zinc-400 hover:bg-zinc-700/90 hover:text-zinc-200"
          }`}
        >
          {tool.icon}
        </button>
      ))}
    </div>
  );
}
