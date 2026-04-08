"use client";

import { useState } from "react";
import { X } from "lucide-react";
import type { Karte } from "@opensoftware/db/openpipeline";

interface NeueKarteDialogProps {
  pipelineId: string;
  stufeId: string;
  onSchliessen: () => void;
  onErstellt: (karte: Karte) => void;
}

export function NeueKarteDialog({ pipelineId, stufeId, onSchliessen, onErstellt }: NeueKarteDialogProps) {
  const [titel, setTitel] = useState("");
  const [beschreibung, setBeschreibung] = useState("");
  const [prioritaet, setPrioritaet] = useState("mittel");
  const [saving, setSaving] = useState(false);

  async function erstellen() {
    if (!titel.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/karten", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pipelineId, stufeId, titel, beschreibung, prioritaet }),
      });
      if (res.ok) {
        onErstellt(await res.json());
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onSchliessen}>
      <div
        className="bg-zinc-900 rounded-xl w-full max-w-md mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-zinc-800">
          <h2 className="text-lg font-semibold text-zinc-100">Neue Karte</h2>
          <button onClick={onSchliessen} className="p-1 rounded hover:bg-zinc-800">
            <X className="w-5 h-5 text-zinc-400" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div>
            <label className="text-xs text-zinc-400 block mb-1">Titel</label>
            <input
              value={titel}
              onChange={(e) => setTitel(e.target.value)}
              placeholder="Karten-Titel..."
              autoFocus
              className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
              onKeyDown={(e) => e.key === "Enter" && erstellen()}
            />
          </div>

          <div>
            <label className="text-xs text-zinc-400 block mb-1">Beschreibung (optional)</label>
            <textarea
              value={beschreibung}
              onChange={(e) => setBeschreibung(e.target.value)}
              rows={3}
              className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
            />
          </div>

          <div>
            <label className="text-xs text-zinc-400 block mb-1">Prioritaet</label>
            <select
              value={prioritaet}
              onChange={(e) => setPrioritaet(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-100"
            >
              <option value="kritisch">Kritisch</option>
              <option value="hoch">Hoch</option>
              <option value="mittel">Mittel</option>
              <option value="niedrig">Niedrig</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end gap-2 p-4 border-t border-zinc-800">
          <button
            onClick={onSchliessen}
            className="px-4 py-2 text-sm rounded bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
          >
            Abbrechen
          </button>
          <button
            onClick={erstellen}
            disabled={saving || !titel.trim()}
            className="px-4 py-2 text-sm rounded bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-50"
          >
            {saving ? "Erstellen..." : "Erstellen"}
          </button>
        </div>
      </div>
    </div>
  );
}
