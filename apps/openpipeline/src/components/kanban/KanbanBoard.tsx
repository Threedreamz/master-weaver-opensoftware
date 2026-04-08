"use client";

import { useCallback, useEffect, useState } from "react";
import { DragDropContext, type DropResult } from "@hello-pangea/dnd";
import type { Karte, Stufe } from "@opensoftware/db/openpipeline";
import { useKanbanStore } from "@/stores/kanban-store";
import { KanbanStufe } from "./KanbanStufe";
import { KarteDetailDialog } from "./KarteDetailDialog";
import { NeueKarteDialog } from "./NeueKarteDialog";

interface KanbanBoardProps {
  pipelineId: string;
}

export function KanbanBoard({ pipelineId }: KanbanBoardProps) {
  const { stufen, karten, setStufen, setKarten, moveKarte, setLoading } = useKanbanStore();
  const [selectedKarte, setSelectedKarte] = useState<Karte | null>(null);
  const [neueKarteStufeId, setNeueKarteStufeId] = useState<string | null>(null);

  // Load data
  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [stufenRes, kartenRes] = await Promise.all([
          fetch(`/api/pipelines/${pipelineId}/stufen`),
          fetch(`/api/pipelines/${pipelineId}/karten`),
        ]);
        if (stufenRes.ok) setStufen(await stufenRes.json());
        if (kartenRes.ok) setKarten(await kartenRes.json());
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [pipelineId, setStufen, setKarten, setLoading]);

  const handleDragEnd = useCallback(
    async (result: DropResult) => {
      const { draggableId, destination, source } = result;
      if (!destination) return;
      if (destination.droppableId === source.droppableId && destination.index === source.index) return;

      // Optimistic update
      moveKarte(draggableId, destination.droppableId, destination.index);

      // Persist
      await fetch(`/api/karten/${draggableId}/verschieben`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          neueStufeId: destination.droppableId,
          neuePosition: destination.index,
        }),
      });
    },
    [moveKarte]
  );

  const kartenByStufe = (stufeId: string) =>
    karten
      .filter((k) => k.stufeId === stufeId)
      .sort((a, b) => a.position - b.position);

  const sortedStufen = [...stufen].sort((a, b) => a.position - b.position);

  return (
    <>
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="flex gap-4 overflow-x-auto p-4 h-full">
          {sortedStufen.map((stufe) => (
            <KanbanStufe
              key={stufe.id}
              stufe={stufe}
              karten={kartenByStufe(stufe.id)}
              onKarteKlick={setSelectedKarte}
              onNeueKarte={setNeueKarteStufeId}
            />
          ))}
        </div>
      </DragDropContext>

      {selectedKarte && (
        <KarteDetailDialog
          karte={selectedKarte}
          onSchliessen={() => setSelectedKarte(null)}
          onAktualisiert={(updated) => {
            setKarten(karten.map((k) => (k.id === updated.id ? updated : k)));
            setSelectedKarte(null);
          }}
        />
      )}

      {neueKarteStufeId && (
        <NeueKarteDialog
          pipelineId={pipelineId}
          stufeId={neueKarteStufeId}
          onSchliessen={() => setNeueKarteStufeId(null)}
          onErstellt={(karte) => {
            setKarten([...karten, karte]);
            setNeueKarteStufeId(null);
          }}
        />
      )}
    </>
  );
}
