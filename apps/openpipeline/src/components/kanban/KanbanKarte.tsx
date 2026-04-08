"use client";

import { Draggable } from "@hello-pangea/dnd";
import { Clock, User, AlertTriangle, CheckSquare } from "lucide-react";
import type { Karte } from "@opensoftware/db/openpipeline";

const PRIORITY_COLORS: Record<string, string> = {
  kritisch: "border-l-red-500",
  hoch: "border-l-orange-500",
  mittel: "border-l-blue-500",
  niedrig: "border-l-zinc-500",
};

const STATUS_BADGES: Record<string, { label: string; className: string }> = {
  offen: { label: "Offen", className: "bg-zinc-700 text-zinc-300" },
  in_arbeit: { label: "In Arbeit", className: "bg-blue-900 text-blue-300" },
  blockiert: { label: "Blockiert", className: "bg-red-900 text-red-300" },
  erledigt: { label: "Erledigt", className: "bg-green-900 text-green-300" },
  abgebrochen: { label: "Abgebr.", className: "bg-zinc-800 text-zinc-500" },
};

interface KanbanKarteProps {
  karte: Karte;
  index: number;
  onKlick: (karte: Karte) => void;
}

export function KanbanKarte({ karte, index, onKlick }: KanbanKarteProps) {
  const priorityClass = PRIORITY_COLORS[karte.prioritaet] ?? "border-l-zinc-600";
  const statusBadge = STATUS_BADGES[karte.status];

  return (
    <Draggable draggableId={karte.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          onClick={() => onKlick(karte)}
          className={`
            rounded-lg border-l-4 ${priorityClass}
            bg-zinc-800 p-3 mb-2 cursor-pointer
            hover:bg-zinc-750 transition-colors
            ${snapshot.isDragging ? "shadow-xl ring-2 ring-blue-500/50" : "shadow-sm"}
          `}
        >
          <h4 className="text-sm font-medium text-zinc-100 mb-1">{karte.titel}</h4>

          {karte.beschreibung && (
            <p className="text-xs text-zinc-400 mb-2 line-clamp-2">{karte.beschreibung}</p>
          )}

          <div className="flex items-center gap-2 flex-wrap">
            {statusBadge && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded ${statusBadge.className}`}>
                {statusBadge.label}
              </span>
            )}

            {karte.zugewiesenAn && (
              <span className="flex items-center gap-0.5 text-[10px] text-zinc-400">
                <User className="w-3 h-3" />
              </span>
            )}

            {karte.geschaetztStunden && (
              <span className="flex items-center gap-0.5 text-[10px] text-zinc-400">
                <Clock className="w-3 h-3" />
                {karte.geschaetztStunden}h
              </span>
            )}

            {karte.status === "blockiert" && (
              <AlertTriangle className="w-3 h-3 text-red-400" />
            )}

            {karte.labels && karte.labels.length > 0 && (
              <div className="flex gap-1">
                {karte.labels.slice(0, 2).map((label) => (
                  <span key={label} className="text-[10px] px-1 py-0.5 rounded bg-zinc-700 text-zinc-300">
                    {label}
                  </span>
                ))}
              </div>
            )}

            {karte.teamsTicketId && (
              <span className="text-[10px] px-1 py-0.5 rounded bg-indigo-900/50 text-indigo-300">
                Teams
              </span>
            )}
          </div>
        </div>
      )}
    </Draggable>
  );
}
