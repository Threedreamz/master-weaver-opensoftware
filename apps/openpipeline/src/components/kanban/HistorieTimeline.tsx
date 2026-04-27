"use client";

import { ArrowRight, User, Edit, MessageSquare, RefreshCw, GitMerge } from "lucide-react";
import type { KarteHistorie } from "@opensoftware/db/openpipeline";

const AKTION_CONFIG: Record<string, { icon: React.ReactNode; label: string; color: string }> = {
  erstellt: { icon: <GitMerge className="w-3 h-3" />, label: "Erstellt", color: "text-green-400" },
  verschoben: { icon: <ArrowRight className="w-3 h-3" />, label: "Verschoben", color: "text-blue-400" },
  zugewiesen: { icon: <User className="w-3 h-3" />, label: "Zugewiesen", color: "text-purple-400" },
  status_geaendert: { icon: <RefreshCw className="w-3 h-3" />, label: "Status", color: "text-yellow-400" },
  bearbeitet: { icon: <Edit className="w-3 h-3" />, label: "Bearbeitet", color: "text-zinc-400" },
  kommentar: { icon: <MessageSquare className="w-3 h-3" />, label: "Kommentar", color: "text-cyan-400" },
  sync: { icon: <RefreshCw className="w-3 h-3" />, label: "Sync", color: "text-indigo-400" },
};

interface HistorieTimelineProps {
  historie: KarteHistorie[];
}

export function HistorieTimeline({ historie }: HistorieTimelineProps) {
  if (historie.length === 0) {
    return <p className="text-sm text-zinc-500 text-center py-8">Keine Historie vorhanden</p>;
  }

  return (
    <div className="space-y-2">
      {historie.map((entry) => {
        const config = AKTION_CONFIG[entry.aktion] ?? AKTION_CONFIG.bearbeitet;
        return (
          <div key={entry.id} className="flex items-start gap-3 px-2 py-2 rounded-lg hover:bg-zinc-800/50">
            <div className={`mt-0.5 ${config.color}`}>{config.icon}</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className={`text-xs font-medium ${config.color}`}>{config.label}</span>
                {entry.userId && <span className="text-[10px] text-zinc-500">{entry.userId}</span>}
                <span className="text-[10px] text-zinc-600 ml-auto">
                  {new Date(entry.createdAt).toLocaleString("de-DE")}
                </span>
              </div>
              {entry.kommentar && (
                <p className="text-xs text-zinc-400 mt-0.5 truncate">{entry.kommentar}</p>
              )}
              {entry.vonStatus && entry.nachStatus && (
                <p className="text-xs text-zinc-500 mt-0.5">
                  {entry.vonStatus} → {entry.nachStatus}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
