"use client";

import { useState } from "react";
import { X, Save, Trash2, CheckCircle2, Circle } from "lucide-react";
import type { Listenbeschreibung, OnboardingItem } from "@opensoftware/db/openpipeline";
import { VideoEmbed } from "./VideoEmbed";

interface BeschreibungDetailDialogProps {
  beschreibung: Listenbeschreibung | null;
  stufeId: string;
  pipelineId: string;
  istVorgesetzter: boolean;
  onSchliessen: () => void;
  onAktualisiert: (data: Listenbeschreibung) => void;
}

const ONBOARDING_TYP_LABELS: Record<string, { label: string; farbe: string }> = {
  theorie: { label: "Theorie", farbe: "bg-purple-900/50 text-purple-300" },
  praxis: { label: "Praxis", farbe: "bg-green-900/50 text-green-300" },
  vormachen: { label: "Vormachen", farbe: "bg-blue-900/50 text-blue-300" },
  korrektur: { label: "Korrektur", farbe: "bg-orange-900/50 text-orange-300" },
};

export function BeschreibungDetailDialog({
  beschreibung,
  stufeId,
  pipelineId,
  istVorgesetzter,
  onSchliessen,
  onAktualisiert,
}: BeschreibungDetailDialogProps) {
  const [was, setWas] = useState(beschreibung?.was ?? "");
  const [warum, setWarum] = useState(beschreibung?.warum ?? "");
  const [wie, setWie] = useState(beschreibung?.wie ?? "");
  const [videoUrl, setVideoUrl] = useState(beschreibung?.videoUrl ?? "");
  const [videoTitel, setVideoTitel] = useState(beschreibung?.videoTitel ?? "");
  const [istEngpass, setIstEngpass] = useState(beschreibung?.istEngpass ?? false);
  const [verantwortlicherUserId, setVerantwortlicherUserId] = useState(
    beschreibung?.verantwortlicherUserId ?? ""
  );
  const [saving, setSaving] = useState(false);

  const onboardingCheckliste = beschreibung?.onboardingCheckliste as OnboardingItem[] | null;

  async function handleSpeichern() {
    if (!was.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/stufen/${stufeId}/beschreibung`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          was: was.trim(),
          warum: warum.trim() || null,
          wie: wie.trim() || null,
          videoUrl: videoUrl.trim() || null,
          videoTitel: videoTitel.trim() || null,
          istEngpass,
          verantwortlicherUserId: verantwortlicherUserId.trim() || null,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        onAktualisiert(data);
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleLoeschen() {
    const res = await fetch(`/api/stufen/${stufeId}/beschreibung`, { method: "DELETE" });
    if (res.ok) onSchliessen();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-zinc-900 border border-zinc-700 rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
          <h2 className="text-sm font-semibold text-zinc-200">
            {istVorgesetzter ? "Listenbeschreibung bearbeiten" : "Listenbeschreibung"}
          </h2>
          <button
            onClick={onSchliessen}
            className="p-1 rounded hover:bg-zinc-800 text-zinc-400"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Was */}
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1">
              Was — Aktions-Titel
            </label>
            {istVorgesetzter ? (
              <input
                value={was}
                onChange={(e) => setWas(e.target.value)}
                placeholder='z.B. "Scan starten"'
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            ) : (
              <p className="text-sm font-bold text-zinc-100">{was}</p>
            )}
          </div>

          {/* Warum */}
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1">
              Warum — Zweck / Kontext
            </label>
            {istVorgesetzter ? (
              <textarea
                value={warum}
                onChange={(e) => setWarum(e.target.value)}
                placeholder="Warum gibt es diesen Schritt?"
                rows={2}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
              />
            ) : (
              warum && <p className="text-sm text-zinc-300">{warum}</p>
            )}
          </div>

          {/* Wie */}
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1">
              Wie — Detaillierte Anleitung
            </label>
            {istVorgesetzter ? (
              <textarea
                value={wie}
                onChange={(e) => setWie(e.target.value)}
                placeholder="Schritt-für-Schritt Anleitung (Markdown)"
                rows={5}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-y font-mono"
              />
            ) : (
              wie && (
                <div className="prose prose-invert prose-sm max-w-none">
                  <pre className="whitespace-pre-wrap text-sm text-zinc-300 bg-zinc-800 rounded-lg p-3">
                    {wie}
                  </pre>
                </div>
              )
            )}
          </div>

          {/* Video */}
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1">
              Onboarding Video
            </label>
            {istVorgesetzter ? (
              <div className="space-y-2">
                <input
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  placeholder="YouTube oder Vimeo URL"
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <input
                  value={videoTitel}
                  onChange={(e) => setVideoTitel(e.target.value)}
                  placeholder="Video-Titel (optional)"
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            ) : null}
            {videoUrl && (
              <div className="mt-2">
                <VideoEmbed url={videoUrl} titel={videoTitel ?? undefined} />
              </div>
            )}
          </div>

          {/* Onboarding Checkliste (Read-only for now, managed via API) */}
          {onboardingCheckliste && onboardingCheckliste.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-2">
                Onboarding-Checkliste (Fischer 4-Säulen)
              </label>
              <div className="space-y-1.5">
                {onboardingCheckliste.map((item, i) => {
                  const typInfo = ONBOARDING_TYP_LABELS[item.typ];
                  return (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      {item.erledigt ? (
                        <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
                      ) : (
                        <Circle className="w-4 h-4 text-zinc-600 shrink-0" />
                      )}
                      <span className="text-zinc-200">{item.titel}</span>
                      {typInfo && (
                        <span className={`text-[10px] px-1.5 py-0.5 rounded ${typInfo.farbe}`}>
                          {typInfo.label}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Engpass Toggle + Verantwortlicher (Vorgesetzter only) */}
          {istVorgesetzter && (
            <div className="space-y-3 pt-2 border-t border-zinc-800">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={istEngpass}
                  onChange={(e) => setIstEngpass(e.target.checked)}
                  className="rounded border-zinc-600 bg-zinc-800 text-amber-500 focus:ring-amber-500"
                />
                <span className="text-sm text-zinc-300">Engpass-Stage (Fischer Engpassfokus)</span>
              </label>

              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">
                  Verantwortlicher (User-ID)
                </label>
                <input
                  value={verantwortlicherUserId}
                  onChange={(e) => setVerantwortlicherUserId(e.target.value)}
                  placeholder="User-ID des Verantwortlichen"
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {istVorgesetzter && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-zinc-800">
            {beschreibung ? (
              <button
                onClick={handleLoeschen}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded-lg transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Löschen
              </button>
            ) : (
              <div />
            )}
            <button
              onClick={handleSpeichern}
              disabled={!was.trim() || saving}
              className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Save className="w-3.5 h-3.5" />
              {saving ? "Speichern..." : "Speichern"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
