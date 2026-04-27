"use client";

import { useState } from "react";
import { X, Clock, User, Tag, History } from "lucide-react";
import type { Karte } from "@opensoftware/db/openpipeline";

interface KarteDetailDialogProps {
  karte: Karte;
  onSchliessen: () => void;
  onAktualisiert: (karte: Karte) => void;
}

export function KarteDetailDialog({ karte, onSchliessen, onAktualisiert }: KarteDetailDialogProps) {
  const [titel, setTitel] = useState(karte.titel);
  const [beschreibung, setBeschreibung] = useState(karte.beschreibung ?? "");
  const [prioritaet, setPrioritaet] = useState(karte.prioritaet);
  const [status, setStatus] = useState(karte.status);
  const [saving, setSaving] = useState(false);

  async function speichern() {
    setSaving(true);
    try {
      const res = await fetch(`/api/karten/${karte.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ titel, beschreibung, prioritaet, status }),
      });
      if (res.ok) {
        onAktualisiert(await res.json());
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onSchliessen}>
      <div
        className="bg-zinc-900 rounded-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-800">
          <h2 className="text-lg font-semibold text-zinc-100">Karte bearbeiten</h2>
          <button onClick={onSchliessen} className="p-1 rounded hover:bg-zinc-800">
            <X className="w-5 h-5 text-zinc-400" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 space-y-4">
          <div>
            <label className="text-xs text-zinc-400 block mb-1">Titel</label>
            <input
              value={titel}
              onChange={(e) => setTitel(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="text-xs text-zinc-400 block mb-1">Beschreibung</label>
            <textarea
              value={beschreibung}
              onChange={(e) => setBeschreibung(e.target.value)}
              rows={12}
              className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-y min-h-[200px]"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
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

            <div>
              <label className="text-xs text-zinc-400 block mb-1">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-100"
              >
                <option value="offen">Offen</option>
                <option value="in_arbeit">In Arbeit</option>
                <option value="blockiert">Blockiert</option>
                <option value="erledigt">Erledigt</option>
                <option value="abgebrochen">Abgebrochen</option>
              </select>
            </div>
          </div>

          {/* Sync info */}
          <div className="flex gap-2 text-xs text-zinc-500">
            {karte.teamsTicketId && (
              <span className="flex items-center gap-1 px-2 py-1 bg-indigo-900/30 rounded text-indigo-300">
                Teams Sync aktiv
              </span>
            )}
            {karte.bountyAufgabeId && (
              <span className="flex items-center gap-1 px-2 py-1 bg-green-900/30 rounded text-green-300">
                OpenBounty verknuepft
              </span>
            )}
          </div>

          {karte.geschaetztStunden && (
            <div className="flex items-center gap-2 text-xs text-zinc-400">
              <Clock className="w-3 h-3" />
              <span>Geschaetzt: {karte.geschaetztStunden}h</span>
              {karte.tatsaechlichStunden && (
                <span>| Tatsaechlich: {karte.tatsaechlichStunden}h</span>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 p-4 border-t border-zinc-800">
          <button
            onClick={onSchliessen}
            className="px-4 py-2 text-sm rounded bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
          >
            Abbrechen
          </button>
          <button
            onClick={speichern}
            disabled={saving}
            className="px-4 py-2 text-sm rounded bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-50"
          >
            {saving ? "Speichern..." : "Speichern"}
          </button>
        </div>
      </div>
    </div>
  );
}
