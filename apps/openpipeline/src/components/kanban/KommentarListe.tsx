"use client";

import { MessageSquare, Pencil, Trash2 } from "lucide-react";
import type { Kommentar } from "@opensoftware/db/openpipeline";

interface KommentarListeProps {
  kommentare: Kommentar[];
  karteId: string;
  onUpdated: (kommentare: Kommentar[]) => void;
}

export function KommentarListe({ kommentare, karteId, onUpdated }: KommentarListeProps) {
  if (kommentare.length === 0) {
    return (
      <div className="text-center py-8 text-zinc-500">
        <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">Noch keine Kommentare</p>
      </div>
    );
  }

  async function loeschen(kommentarId: string) {
    const res = await fetch(`/api/karten/${karteId}/kommentare/${kommentarId}`, { method: "DELETE" });
    if (res.ok) {
      onUpdated(kommentare.filter((k) => k.id !== kommentarId));
    }
  }

  return (
    <div className="space-y-3">
      {kommentare.map((k) => (
        <div key={k.id} className="bg-zinc-800 rounded-lg p-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-zinc-400">
              {k.userId} &middot; {new Date(k.createdAt).toLocaleString("de-DE")}
              {k.bearbeitetAm && <span className="italic"> (bearbeitet)</span>}
            </span>
            <button onClick={() => loeschen(k.id)} className="p-1 rounded hover:bg-zinc-700 text-zinc-500 hover:text-red-400">
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
          <div className="text-sm text-zinc-200 whitespace-pre-wrap">{k.inhalt}</div>
        </div>
      ))}
    </div>
  );
}
