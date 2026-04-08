"use client";

import { Droppable } from "@hello-pangea/dnd";
import { ChevronRight, Plus } from "lucide-react";
import type { Stufe, Karte } from "@opensoftware/db/openpipeline";
import { KanbanKarte } from "./KanbanKarte";

interface KanbanStufeProps {
  stufe: Stufe;
  karten: Karte[];
  onKarteKlick: (karte: Karte) => void;
  onNeueKarte: (stufeId: string) => void;
  onSubPipelineKlick?: (subPipelineId: string) => void;
}

export function KanbanStufe({
  stufe,
  karten,
  onKarteKlick,
  onNeueKarte,
  onSubPipelineKlick,
}: KanbanStufeProps) {
  const kartenCount = karten.length;
  const wipWarning = stufe.wipLimit && kartenCount >= stufe.wipLimit;

  return (
    <div className="flex flex-col min-w-[280px] max-w-[320px] bg-zinc-900 rounded-xl">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          {stufe.farbe && (
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: stufe.farbe }} />
          )}
          <h3 className="text-sm font-semibold text-zinc-200">{stufe.name}</h3>
          <span className={`text-xs px-1.5 py-0.5 rounded ${wipWarning ? "bg-red-900 text-red-300" : "bg-zinc-800 text-zinc-400"}`}>
            {kartenCount}{stufe.wipLimit ? `/${stufe.wipLimit}` : ""}
          </span>
        </div>

        <div className="flex items-center gap-1">
          {stufe.subPipelineId && onSubPipelineKlick && (
            <button
              onClick={() => onSubPipelineKlick(stufe.subPipelineId!)}
              className="p-1 rounded hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200"
              title="Sub-Pipeline oeffnen"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={() => onNeueKarte(stufe.id)}
            className="p-1 rounded hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200"
            title="Neue Karte"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Droppable area */}
      <Droppable droppableId={stufe.id}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`
              flex-1 p-2 min-h-[100px] overflow-y-auto
              ${snapshot.isDraggingOver ? "bg-zinc-800/50" : ""}
            `}
          >
            {karten.map((karte, index) => (
              <KanbanKarte
                key={karte.id}
                karte={karte}
                index={index}
                onKlick={onKarteKlick}
              />
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  );
}
