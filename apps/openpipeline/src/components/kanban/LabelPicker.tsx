"use client";

import { useEffect, useState } from "react";
import { Plus, X } from "lucide-react";
import type { Label } from "@opensoftware/db/openpipeline";

interface LabelPickerProps {
  karteId: string;
  pipelineId: string;
  aktiveLabels: Label[];
  onChanged: (labels: Label[]) => void;
}

export function LabelPicker({ karteId, pipelineId, aktiveLabels, onChanged }: LabelPickerProps) {
  const [alleLabels, setAlleLabels] = useState<Label[]>([]);
  const [showPicker, setShowPicker] = useState(false);

  useEffect(() => {
    if (showPicker) {
      fetch(`/api/pipelines/${pipelineId}/labels`)
        .then((r) => r.ok ? r.json() : [])
        .then(setAlleLabels);
    }
  }, [showPicker, pipelineId]);

  const aktiveIds = new Set(aktiveLabels.map((l) => l.id));

  async function toggleLabel(label: Label) {
    if (aktiveIds.has(label.id)) {
      await fetch(`/api/karten/${karteId}/labels`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ labelId: label.id }),
      });
      onChanged(aktiveLabels.filter((l) => l.id !== label.id));
    } else {
      await fetch(`/api/karten/${karteId}/labels`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ labelId: label.id }),
      });
      onChanged([...aktiveLabels, label]);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap gap-1 mb-2">
        {aktiveLabels.map((label) => (
          <span
            key={label.id}
            className="text-[11px] px-2 py-0.5 rounded-full text-white font-medium flex items-center gap-1 cursor-pointer"
            style={{ backgroundColor: label.farbe }}
            onClick={() => toggleLabel(label)}
          >
            {label.name}
            <X className="w-3 h-3" />
          </span>
        ))}
        <button
          onClick={() => setShowPicker(!showPicker)}
          className="text-[11px] px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 hover:text-zinc-200 flex items-center gap-1"
        >
          <Plus className="w-3 h-3" /> Label
        </button>
      </div>

      {showPicker && (
        <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-2 space-y-1">
          {alleLabels.filter((l) => !aktiveIds.has(l.id)).map((label) => (
            <button
              key={label.id}
              onClick={() => toggleLabel(label)}
              className="w-full flex items-center gap-2 px-2 py-1 rounded hover:bg-zinc-700 text-left"
            >
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: label.farbe }} />
              <span className="text-sm text-zinc-200">{label.name}</span>
            </button>
          ))}
          {alleLabels.filter((l) => !aktiveIds.has(l.id)).length === 0 && (
            <p className="text-xs text-zinc-500 px-2">Alle Labels zugewiesen</p>
          )}
        </div>
      )}
    </div>
  );
}
