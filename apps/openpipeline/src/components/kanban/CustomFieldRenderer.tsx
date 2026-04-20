"use client";

import { useState } from "react";
import type { CustomFieldDefinition } from "@opensoftware/db/openpipeline";

interface CustomFieldRendererProps {
  karteId: string;
  felder: (CustomFieldDefinition & { wert: string | null })[];
  onChanged: (felder: (CustomFieldDefinition & { wert: string | null })[]) => void;
}

export function CustomFieldRenderer({ karteId, felder, onChanged }: CustomFieldRendererProps) {
  const [saving, setSaving] = useState(false);

  async function updateWert(feldId: string, wert: string | null) {
    const updated = felder.map((f) => f.id === feldId ? { ...f, wert } : f);
    onChanged(updated);
  }

  async function speichern() {
    setSaving(true);
    try {
      await fetch(`/api/karten/${karteId}/custom-fields`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          felder: felder.map((f) => ({ feldId: f.id, wert: f.wert })),
        }),
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-2">
      {felder.map((feld) => (
        <div key={feld.id} className="flex items-center gap-2">
          <label className="text-xs text-zinc-400 w-28 shrink-0 flex items-center gap-1">
            {feld.name}
            {feld.istPrio && <span className="text-[9px] px-1 py-0 rounded bg-yellow-900 text-yellow-300">Prio</span>}
          </label>

          {feld.typ === "text" && (
            <input
              value={feld.wert ?? ""}
              onChange={(e) => updateWert(feld.id, e.target.value)}
              className="flex-1 bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-sm text-zinc-100"
            />
          )}

          {feld.typ === "zahl" && (
            <input
              type="number"
              value={feld.wert ?? ""}
              onChange={(e) => updateWert(feld.id, e.target.value)}
              className="flex-1 bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-sm text-zinc-100"
            />
          )}

          {feld.typ === "dropdown" && (
            <select
              value={feld.wert ?? ""}
              onChange={(e) => updateWert(feld.id, e.target.value)}
              className="flex-1 bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-sm text-zinc-100"
            >
              <option value="">-- Auswahl --</option>
              {(feld.optionen ?? []).map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          )}

          {feld.typ === "checkbox" && (
            <input
              type="checkbox"
              checked={feld.wert === "true"}
              onChange={(e) => updateWert(feld.id, e.target.checked ? "true" : "false")}
              className="rounded bg-zinc-700 border-zinc-600"
            />
          )}
        </div>
      ))}

      <button
        onClick={speichern}
        disabled={saving}
        className="text-xs px-3 py-1 rounded bg-zinc-700 text-zinc-300 hover:bg-zinc-600 disabled:opacity-50"
      >
        {saving ? "Speichern..." : "Felder speichern"}
      </button>
    </div>
  );
}
