"use client";

import { useCallback, useEffect, useState } from "react";
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd";
import type { Karte, Stufe } from "@opensoftware/db/openpipeline";
import { useKanbanStore } from "@/stores/kanban-store";
import { KanbanStufe } from "./KanbanStufe";
import { KarteDetailPanel } from "./KarteDetailPanel";
import { NeueKarteDialog } from "./NeueKarteDialog";
import { FilterBar, EMPTY_FILTER, type FilterState } from "./FilterBar";

interface KanbanBoardProps {
  pipelineId: string;
}

export function KanbanBoard({ pipelineId }: KanbanBoardProps) {
  const { stufen, karten, setStufen, setKarten, moveKarte, setLoading } = useKanbanStore();
  const [selectedKarte, setSelectedKarte] = useState<Karte | null>(null);
  const [neueKarteStufeId, setNeueKarteStufeId] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterState>(EMPTY_FILTER);

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

  // URL-based card selection
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const karteId = params.get("karte");
    if (karteId && karten.length > 0) {
      const karte = karten.find((k) => k.id === karteId);
      if (karte) setSelectedKarte(karte);
    }
  }, [karten]);

  const handleDragEnd = useCallback(
    async (result: DropResult) => {
      const { draggableId, destination, source, type } = result;
      if (!destination) return;
      if (destination.droppableId === source.droppableId && destination.index === source.index) return;

      if (type === "STUFE") {
        // Reorder stages
        const sorted = [...stufen].sort((a, b) => a.position - b.position);
        const [moved] = sorted.splice(source.index, 1);
        sorted.splice(destination.index, 0, moved);
        const reordered = sorted.map((s, i) => ({ ...s, position: i }));
        setStufen(reordered);

        await fetch(`/api/pipelines/${pipelineId}/stufen/reorder`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ stufenIds: reordered.map((s) => s.id) }),
        });
        return;
      }

      // Move card
      moveKarte(draggableId, destination.droppableId, destination.index);

      await fetch(`/api/karten/${draggableId}/verschieben`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          neueStufeId: destination.droppableId,
          neuePosition: destination.index,
        }),
      });
    },
    [moveKarte, stufen, setStufen, pipelineId]
  );

  // Apply filters client-side
  const filteredKarten = karten.filter((k) => {
    if (k.istVorlage) return false;
    if (filter.suche && !k.titel.toLowerCase().includes(filter.suche.toLowerCase())) return false;
    if (filter.status.length > 0 && !filter.status.includes(k.status)) return false;
    if (filter.prioritaet.length > 0 && !filter.prioritaet.includes(k.prioritaet)) return false;
    return true;
  });

  const kartenByStufe = (stufeId: string) =>
    filteredKarten
      .filter((k) => k.stufeId === stufeId)
      .sort((a, b) => a.position - b.position);

  const sortedStufen = [...stufen].sort((a, b) => a.position - b.position);

  function openKarte(karte: Karte) {
    setSelectedKarte(karte);
    const url = new URL(window.location.href);
    url.searchParams.set("karte", karte.id);
    window.history.replaceState({}, "", url.toString());
  }

  function closeKarte() {
    setSelectedKarte(null);
    const url = new URL(window.location.href);
    url.searchParams.delete("karte");
    window.history.replaceState({}, "", url.toString());
  }

  return (
    <>
      <FilterBar pipelineId={pipelineId} filter={filter} onFilterChange={setFilter} />

      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="board" direction="horizontal" type="STUFE">
          {(provided) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className="flex gap-4 overflow-x-auto p-4 h-full min-h-0"
            >
              {sortedStufen.map((stufe, index) => (
                <Draggable key={stufe.id} draggableId={`stufe-${stufe.id}`} index={index}>
                  {(dragProvided, dragSnapshot) => (
                    <div
                      ref={dragProvided.innerRef}
                      {...dragProvided.draggableProps}
                      className={dragSnapshot.isDragging ? "opacity-80" : ""}
                    >
                      <KanbanStufe
                        stufe={stufe}
                        karten={kartenByStufe(stufe.id)}
                        onKarteKlick={openKarte}
                        onNeueKarte={setNeueKarteStufeId}
                        dragHandleProps={dragProvided.dragHandleProps}
                      />
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      {selectedKarte && (
        <KarteDetailPanel
          karte={selectedKarte}
          pipelineId={pipelineId}
          onSchliessen={closeKarte}
          onAktualisiert={(updated) => {
            setKarten(karten.map((k) => (k.id === updated.id ? updated : k)));
            setSelectedKarte(updated);
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
