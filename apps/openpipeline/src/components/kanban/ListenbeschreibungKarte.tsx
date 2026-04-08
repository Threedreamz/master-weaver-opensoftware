"use client";

import { useState } from "react";
import { Play, FileText, Pencil, AlertTriangle, User, X } from "lucide-react";
import type { Listenbeschreibung } from "@opensoftware/db/openpipeline";
import { BeschreibungDetailDialog } from "./BeschreibungDetailDialog";
import { VideoEmbed } from "./VideoEmbed";

interface ListenbeschreibungKarteProps {
  beschreibung: Listenbeschreibung | null;
  stufeId: string;
  pipelineId: string;
  istVorgesetzter: boolean;
  onAktualisiert?: (data: Listenbeschreibung) => void;
}

export function ListenbeschreibungKarte({
  beschreibung,
  stufeId,
  pipelineId,
  istVorgesetzter,
  onAktualisiert,
}: ListenbeschreibungKarteProps) {
  const [dialogOffen, setDialogOffen] = useState(false);
  const [videoPopupOffen, setVideoPopupOffen] = useState(false);

  if (!beschreibung && !istVorgesetzter) return null;

  if (!beschreibung) {
    // Vorgesetzter sieht Platzhalter zum Erstellen
    return (
      <>
        <button
          onClick={() => setDialogOffen(true)}
          className="w-full p-3 mb-1 rounded-lg border border-dashed border-zinc-700 text-zinc-500 text-sm hover:border-zinc-500 hover:text-zinc-400 transition-colors text-left"
        >
          + Listenbeschreibung hinzufügen (Was / Warum / Wie)
        </button>
        {dialogOffen && (
          <BeschreibungDetailDialog
            beschreibung={null}
            stufeId={stufeId}
            pipelineId={pipelineId}
            istVorgesetzter={istVorgesetzter}
            onSchliessen={() => setDialogOffen(false)}
            onAktualisiert={(data) => {
              onAktualisiert?.(data);
              setDialogOffen(false);
            }}
          />
        )}
      </>
    );
  }

  return (
    <>
      <div
        onClick={() => setDialogOffen(true)}
        className="relative p-3 mb-1 rounded-lg bg-zinc-800/80 border border-zinc-700/50 cursor-pointer hover:bg-zinc-800 transition-colors"
      >
        {/* Was — Aktions-Titel */}
        <div className="flex items-start justify-between gap-2">
          <h4 className="text-sm font-bold text-zinc-100 leading-tight">
            {beschreibung.was}
          </h4>
          {istVorgesetzter && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setDialogOffen(true);
              }}
              className="p-1 rounded hover:bg-zinc-700 text-zinc-500 hover:text-zinc-300 shrink-0"
              title="Bearbeiten"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Warum — Zweck/Kontext */}
        {beschreibung.warum && (
          <p className="text-xs text-zinc-400 mt-1 leading-relaxed line-clamp-2">
            {beschreibung.warum}
          </p>
        )}

        {/* Action Buttons + Badges */}
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          {beschreibung.videoUrl && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setVideoPopupOffen(true);
              }}
              className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-blue-900/50 text-blue-300 hover:bg-blue-800/60 transition-colors"
            >
              <Play className="w-3 h-3" />
              Video
            </button>
          )}

          {beschreibung.wie && (
            <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-zinc-700 text-zinc-300">
              <FileText className="w-3 h-3" />
              Anleitung
            </span>
          )}

          {beschreibung.istEngpass && (
            <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-amber-900/50 text-amber-300 font-medium">
              <AlertTriangle className="w-3 h-3" />
              Engpass
            </span>
          )}

          {beschreibung.verantwortlicherUserId && (
            <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-zinc-700/50 text-zinc-400">
              <User className="w-3 h-3" />
              Verantw.
            </span>
          )}
        </div>
      </div>

      {/* Video Popup — direkt abspielen */}
      {videoPopupOffen && beschreibung.videoUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
          onClick={() => setVideoPopupOffen(false)}
        >
          <div
            className="relative w-full max-w-2xl mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setVideoPopupOffen(false)}
              className="absolute -top-10 right-0 p-1.5 rounded-lg bg-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            {beschreibung.videoTitel && (
              <p className="text-sm text-zinc-300 mb-2 font-medium">
                {beschreibung.videoTitel}
              </p>
            )}
            <VideoEmbed
              url={beschreibung.videoUrl}
              titel={beschreibung.videoTitel ?? undefined}
            />
          </div>
        </div>
      )}

      {dialogOffen && (
        <BeschreibungDetailDialog
          beschreibung={beschreibung}
          stufeId={stufeId}
          pipelineId={pipelineId}
          istVorgesetzter={istVorgesetzter}
          onSchliessen={() => setDialogOffen(false)}
          onAktualisiert={(data) => {
            onAktualisiert?.(data);
            setDialogOffen(false);
          }}
        />
      )}
    </>
  );
}
