"use client";

import { useEffect, useState } from "react";
import { Plus, X } from "lucide-react";
import type { PipelineMitglied } from "@opensoftware/db/openpipeline";

interface MemberPickerProps {
  karteId: string;
  pipelineId: string;
  aktiveMitglieder: { userId: string; rolle: string }[];
  onChanged: (mitglieder: { userId: string; rolle: string }[]) => void;
}

export function MemberPicker({ karteId, pipelineId, aktiveMitglieder, onChanged }: MemberPickerProps) {
  const [alleMitglieder, setAlleMitglieder] = useState<PipelineMitglied[]>([]);
  const [showPicker, setShowPicker] = useState(false);

  useEffect(() => {
    if (showPicker) {
      fetch(`/api/pipelines/${pipelineId}/mitglieder`)
        .then((r) => r.ok ? r.json() : [])
        .then(setAlleMitglieder);
    }
  }, [showPicker, pipelineId]);

  const aktiveIds = new Set(aktiveMitglieder.map((m) => m.userId));

  async function addMember(userId: string) {
    await fetch(`/api/karten/${karteId}/mitglieder`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, rolle: "mitarbeiter" }),
    });
    onChanged([...aktiveMitglieder, { userId, rolle: "mitarbeiter" }]);
  }

  async function removeMember(userId: string) {
    await fetch(`/api/karten/${karteId}/mitglieder/${userId}`, { method: "DELETE" });
    onChanged(aktiveMitglieder.filter((m) => m.userId !== userId));
  }

  return (
    <div>
      <div className="flex flex-wrap gap-1 mb-2">
        {aktiveMitglieder.map((m) => (
          <span
            key={m.userId}
            className="text-[11px] px-2 py-0.5 rounded-full bg-zinc-700 text-zinc-200 flex items-center gap-1 cursor-pointer"
            onClick={() => removeMember(m.userId)}
          >
            {m.userId.slice(0, 8)}
            <X className="w-3 h-3" />
          </span>
        ))}
        <button
          onClick={() => setShowPicker(!showPicker)}
          className="text-[11px] px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 hover:text-zinc-200 flex items-center gap-1"
        >
          <Plus className="w-3 h-3" /> Mitglied
        </button>
      </div>

      {showPicker && (
        <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-2 space-y-1">
          {alleMitglieder.filter((m) => !aktiveIds.has(m.userId)).map((m) => (
            <button
              key={m.userId}
              onClick={() => addMember(m.userId)}
              className="w-full flex items-center gap-2 px-2 py-1 rounded hover:bg-zinc-700 text-left"
            >
              <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center text-[10px] text-white font-medium">
                {(m.name || m.userId).charAt(0).toUpperCase()}
              </div>
              <span className="text-sm text-zinc-200">{m.name || m.userId}</span>
              <span className="text-xs text-zinc-500 ml-auto">{m.rolle}</span>
            </button>
          ))}
          {alleMitglieder.filter((m) => !aktiveIds.has(m.userId)).length === 0 && (
            <p className="text-xs text-zinc-500 px-2">Alle Mitglieder zugewiesen</p>
          )}
        </div>
      )}
    </div>
  );
}
