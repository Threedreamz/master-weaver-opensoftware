"use client";

import { Download, Trash2, FileText, Image, File } from "lucide-react";
import type { Anhang } from "@opensoftware/db/openpipeline";

interface AnhaengeListeProps {
  anhaenge: Anhang[];
  onGeloescht: (id: string) => void;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getIcon(mimetype: string) {
  if (mimetype.startsWith("image/")) return <Image className="w-4 h-4 text-green-400" />;
  if (mimetype.includes("pdf") || mimetype.includes("text")) return <FileText className="w-4 h-4 text-blue-400" />;
  return <File className="w-4 h-4 text-zinc-400" />;
}

export function AnhaengeListe({ anhaenge, onGeloescht }: AnhaengeListeProps) {
  if (anhaenge.length === 0) {
    return <p className="text-sm text-zinc-500 text-center py-4">Keine Anhaenge</p>;
  }

  async function loeschen(anhang: Anhang) {
    const res = await fetch(`/api/karten/${anhang.karteId}/anhaenge/${anhang.id}`, { method: "DELETE" });
    if (res.ok) onGeloescht(anhang.id);
  }

  return (
    <div className="space-y-1">
      {anhaenge.map((a) => (
        <div key={a.id} className="flex items-center gap-3 bg-zinc-800 rounded-lg px-3 py-2">
          {getIcon(a.mimetype)}
          <div className="flex-1 min-w-0">
            <p className="text-sm text-zinc-200 truncate">{a.originalname}</p>
            <p className="text-[10px] text-zinc-500">{formatBytes(a.groesse)}</p>
          </div>
          <a
            href={`/api/anhaenge/${a.id}/download`}
            className="p-1.5 rounded hover:bg-zinc-700 text-zinc-400 hover:text-blue-400"
            download
          >
            <Download className="w-4 h-4" />
          </a>
          <button onClick={() => loeschen(a)} className="p-1.5 rounded hover:bg-zinc-700 text-zinc-400 hover:text-red-400">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
