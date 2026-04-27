"use client";

import { useState } from "react";
import { Send } from "lucide-react";
import type { Kommentar } from "@opensoftware/db/openpipeline";

interface KommentarEditorProps {
  karteId: string;
  onErstellt: (kommentar: Kommentar) => void;
}

export function KommentarEditor({ karteId, onErstellt }: KommentarEditorProps) {
  const [inhalt, setInhalt] = useState("");
  const [sending, setSending] = useState(false);

  async function absenden() {
    if (!inhalt.trim()) return;
    setSending(true);
    try {
      const res = await fetch(`/api/karten/${karteId}/kommentare`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inhalt }),
      });
      if (res.ok) {
        const kommentar = await res.json();
        onErstellt(kommentar);
        setInhalt("");
      }
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex gap-2">
      <textarea
        value={inhalt}
        onChange={(e) => setInhalt(e.target.value)}
        placeholder="Kommentar schreiben... (Markdown)"
        rows={2}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) absenden();
        }}
        className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
      />
      <button
        onClick={absenden}
        disabled={sending || !inhalt.trim()}
        className="self-end px-3 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Send className="w-4 h-4" />
      </button>
    </div>
  );
}
