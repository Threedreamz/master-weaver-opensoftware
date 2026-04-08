"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";

interface ModuleNodeData {
  label: string;
  moduleName: string;
  color: string;
  icon?: string | null;
  isStart: boolean;
  isEnd: boolean;
}

export function ModuleNode({ data }: NodeProps) {
  const d = data as unknown as ModuleNodeData;

  return (
    <div className="relative">
      {!d.isStart && (
        <Handle
          type="target"
          position={Position.Top}
          className="!bg-gray-400 !w-3 !h-3 !border-2 !border-white"
        />
      )}
      <div
        className="px-4 py-3 rounded-lg border-2 shadow-md min-w-[160px] text-center bg-white"
        style={{ borderColor: d.color || "#6366f1" }}
      >
        {d.isStart && (
          <div
            className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs font-bold text-green-600 whitespace-nowrap"
          >
            ▶ START
          </div>
        )}
        {d.isEnd && (
          <div
            className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-xs font-bold text-red-600 whitespace-nowrap"
          >
            ■ END
          </div>
        )}
        {d.icon && (
          <div
            className="w-7 h-7 rounded-md flex items-center justify-center text-white text-xs font-bold mx-auto mb-1.5"
            style={{ backgroundColor: d.color || "#6366f1" }}
          >
            {d.icon.slice(0, 2).toUpperCase()}
          </div>
        )}
        <div className="text-xs text-gray-400 mb-0.5 leading-tight">{d.moduleName}</div>
        <div className="font-semibold text-sm text-gray-900 leading-snug">{d.label}</div>
      </div>
      {!d.isEnd && (
        <Handle
          type="source"
          position={Position.Bottom}
          className="!bg-gray-400 !w-3 !h-3 !border-2 !border-white"
        />
      )}
    </div>
  );
}
