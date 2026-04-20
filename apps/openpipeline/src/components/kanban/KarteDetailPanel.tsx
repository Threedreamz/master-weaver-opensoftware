"use client";

import { useCallback, useEffect, useState } from "react";
import {
  X, MessageSquare, Paperclip, History, CheckSquare,
  Settings2, Calendar, Users, Tag,
} from "lucide-react";
import type { Karte, Label, Kommentar, Anhang, ChecklistenItem, KarteHistorie, CustomFieldDefinition } from "@opensoftware/db/openpipeline";
import { KommentarListe } from "./KommentarListe";
import { KommentarEditor } from "./KommentarEditor";
import { AnhaengeListe } from "./AnhaengeListe";
import { DateiUpload } from "./DateiUpload";
import { LabelPicker } from "./LabelPicker";
import { MemberPicker } from "./MemberPicker";
import { MemberAvatars } from "./MemberAvatars";
import { CustomFieldRenderer } from "./CustomFieldRenderer";
import { HistorieTimeline } from "./HistorieTimeline";
import { getDueDateStatus, formatDate } from "@/lib/date-utils";

type Tab = "uebersicht" | "checklisten" | "kommentare" | "historie" | "anhaenge";

interface KarteDetailPanelProps {
  karte: Karte;
  pipelineId: string;
  onSchliessen: () => void;
  onAktualisiert: (karte: Karte) => void;
}

export function KarteDetailPanel({ karte, pipelineId, onSchliessen, onAktualisiert }: KarteDetailPanelProps) {
  const [activeTab, setActiveTab] = useState<Tab>("uebersicht");
  const [titel, setTitel] = useState(karte.titel);
  const [beschreibung, setBeschreibung] = useState(karte.beschreibung ?? "");
  const [prioritaet, setPrioritaet] = useState(karte.prioritaet);
  const [status, setStatus] = useState(karte.status);
  const [faelligAm, setFaelligAm] = useState(karte.faelligAm ? new Date(karte.faelligAm).toISOString().split("T")[0] : "");
  const [saving, setSaving] = useState(false);

  // Lazy-loaded data
  const [labels, setLabels] = useState<Label[]>([]);
  const [mitglieder, setMitglieder] = useState<{ userId: string; rolle: string }[]>([]);
  const [kommentare, setKommentare] = useState<Kommentar[]>([]);
  const [anhaenge, setAnhaenge] = useState<Anhang[]>([]);
  const [checklisten, setChecklisten] = useState<ChecklistenItem[]>([]);
  const [historie, setHistorie] = useState<KarteHistorie[]>([]);
  const [customFields, setCustomFields] = useState<(CustomFieldDefinition & { wert: string | null })[]>([]);

  // Load card-specific data
  useEffect(() => {
    Promise.all([
      fetch(`/api/karten/${karte.id}/labels`).then((r) => r.ok ? r.json() : []),
      fetch(`/api/karten/${karte.id}/mitglieder`).then((r) => r.ok ? r.json() : []),
      fetch(`/api/karten/${karte.id}/checkliste`).then((r) => r.ok ? r.json() : []),
      fetch(`/api/karten/${karte.id}/custom-fields`).then((r) => r.ok ? r.json() : []),
    ]).then(([l, m, cl, cf]) => {
      setLabels(l);
      setMitglieder(m);
      setChecklisten(cl);
      setCustomFields(cf);
    });
  }, [karte.id]);

  // Load tab-specific data lazily
  useEffect(() => {
    if (activeTab === "kommentare" && kommentare.length === 0) {
      fetch(`/api/karten/${karte.id}/kommentare`).then((r) => r.ok ? r.json() : []).then(setKommentare);
    }
    if (activeTab === "anhaenge" && anhaenge.length === 0) {
      fetch(`/api/karten/${karte.id}/anhaenge`).then((r) => r.ok ? r.json() : []).then(setAnhaenge);
    }
    if (activeTab === "historie" && historie.length === 0) {
      fetch(`/api/karten/${karte.id}/historie`).then((r) => r.ok ? r.json() : []).then(setHistorie);
    }
  }, [activeTab, karte.id, kommentare.length, anhaenge.length, historie.length]);

  // Keyboard shortcut
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onSchliessen();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onSchliessen]);

  const speichern = useCallback(async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/karten/${karte.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          titel,
          beschreibung,
          prioritaet,
          status,
          faelligAm: faelligAm ? new Date(faelligAm) : null,
        }),
      });
      if (res.ok) onAktualisiert(await res.json());
    } finally {
      setSaving(false);
    }
  }, [karte.id, titel, beschreibung, prioritaet, status, faelligAm, onAktualisiert]);

  const dueDateStatus = getDueDateStatus(karte.faelligAm);
  const dueDateColor = dueDateStatus === "overdue" ? "text-red-400" : dueDateStatus === "soon" ? "text-yellow-400" : "text-zinc-400";

  const tabs: { id: Tab; label: string; icon: React.ReactNode; count?: number }[] = [
    { id: "uebersicht", label: "Uebersicht", icon: <Settings2 className="w-4 h-4" /> },
    { id: "checklisten", label: "Checklisten", icon: <CheckSquare className="w-4 h-4" />, count: checklisten.length },
    { id: "kommentare", label: "Kommentare", icon: <MessageSquare className="w-4 h-4" /> },
    { id: "historie", label: "Historie", icon: <History className="w-4 h-4" /> },
    { id: "anhaenge", label: "Anhaenge", icon: <Paperclip className="w-4 h-4" /> },
  ];

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/40" onClick={onSchliessen} />

      {/* Panel */}
      <div className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-2xl bg-zinc-900 border-l border-zinc-800 shadow-2xl flex flex-col animate-slide-in">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <h2 className="text-lg font-semibold text-zinc-100 truncate">{karte.titel}</h2>
            {dueDateStatus && (
              <span className={`text-xs flex items-center gap-1 ${dueDateColor}`}>
                <Calendar className="w-3 h-3" />
                {formatDate(karte.faelligAm)}
              </span>
            )}
          </div>
          <button onClick={onSchliessen} className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Labels + Members bar */}
        <div className="flex items-center gap-2 px-4 py-2 border-b border-zinc-800/50 shrink-0 flex-wrap">
          {labels.map((label) => (
            <span key={label.id} className="text-[10px] px-2 py-0.5 rounded-full text-white font-medium" style={{ backgroundColor: label.farbe }}>
              {label.name}
            </span>
          ))}
          <MemberAvatars mitglieder={mitglieder} maxVisible={4} />
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-4 py-1 border-b border-zinc-800 shrink-0 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-t-lg transition-colors ${
                activeTab === tab.id
                  ? "bg-zinc-800 text-zinc-100"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"
              }`}
            >
              {tab.icon}
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span className="text-[10px] px-1 rounded bg-zinc-700 text-zinc-300">{tab.count}</span>
              )}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {activeTab === "uebersicht" && (
            <div className="space-y-4">
              <div>
                <label className="text-xs text-zinc-400 block mb-1">Titel</label>
                <input
                  value={titel}
                  onChange={(e) => setTitel(e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="text-xs text-zinc-400 block mb-1">Beschreibung</label>
                <textarea
                  value={beschreibung}
                  onChange={(e) => setBeschreibung(e.target.value)}
                  rows={6}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-y"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-zinc-400 block mb-1">Prioritaet</label>
                  <select value={prioritaet} onChange={(e) => setPrioritaet(e.target.value)} className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-100">
                    <option value="kritisch">Kritisch</option>
                    <option value="hoch">Hoch</option>
                    <option value="mittel">Mittel</option>
                    <option value="niedrig">Niedrig</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-zinc-400 block mb-1">Status</label>
                  <select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-100">
                    <option value="offen">Offen</option>
                    <option value="in_arbeit">In Arbeit</option>
                    <option value="blockiert">Blockiert</option>
                    <option value="erledigt">Erledigt</option>
                    <option value="abgebrochen">Abgebrochen</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-zinc-400 block mb-1">Faellig am</label>
                  <input
                    type="date"
                    value={faelligAm}
                    onChange={(e) => setFaelligAm(e.target.value)}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-100"
                  />
                </div>
              </div>

              {/* Labels section */}
              <div>
                <label className="text-xs text-zinc-400 block mb-1 flex items-center gap-1"><Tag className="w-3 h-3" /> Labels</label>
                <LabelPicker
                  karteId={karte.id}
                  pipelineId={pipelineId}
                  aktiveLabels={labels}
                  onChanged={setLabels}
                />
              </div>

              {/* Members section */}
              <div>
                <label className="text-xs text-zinc-400 block mb-1 flex items-center gap-1"><Users className="w-3 h-3" /> Mitglieder</label>
                <MemberPicker
                  karteId={karte.id}
                  pipelineId={pipelineId}
                  aktiveMitglieder={mitglieder}
                  onChanged={setMitglieder}
                />
              </div>

              {/* Custom Fields */}
              {customFields.length > 0 && (
                <div>
                  <label className="text-xs text-zinc-400 block mb-1 flex items-center gap-1"><Settings2 className="w-3 h-3" /> Custom Fields</label>
                  <CustomFieldRenderer
                    karteId={karte.id}
                    felder={customFields}
                    onChanged={setCustomFields}
                  />
                </div>
              )}

              {/* Save button */}
              <div className="flex justify-end pt-2">
                <button
                  onClick={speichern}
                  disabled={saving}
                  className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-50"
                >
                  {saving ? "Speichern..." : "Speichern"}
                </button>
              </div>
            </div>
          )}

          {activeTab === "checklisten" && (
            <div className="space-y-2">
              {checklisten.length === 0 && <p className="text-sm text-zinc-500">Keine Checklisten-Items</p>}
              {checklisten.map((item) => (
                <label key={item.id} className="flex items-center gap-2 text-sm text-zinc-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={item.erledigt}
                    onChange={async () => {
                      const res = await fetch(`/api/karten/${karte.id}/checkliste`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ id: item.id, erledigt: !item.erledigt }),
                      });
                      if (res.ok) {
                        setChecklisten(checklisten.map((c) => c.id === item.id ? { ...c, erledigt: !c.erledigt } : c));
                      }
                    }}
                    className="rounded bg-zinc-700 border-zinc-600"
                  />
                  <span className={item.erledigt ? "line-through text-zinc-500" : ""}>{item.titel}</span>
                </label>
              ))}
            </div>
          )}

          {activeTab === "kommentare" && (
            <div className="space-y-4">
              <KommentarEditor karteId={karte.id} onErstellt={(k) => setKommentare([k, ...kommentare])} />
              <KommentarListe kommentare={kommentare} karteId={karte.id} onUpdated={setKommentare} />
            </div>
          )}

          {activeTab === "historie" && (
            <HistorieTimeline historie={historie} />
          )}

          {activeTab === "anhaenge" && (
            <div className="space-y-4">
              <DateiUpload karteId={karte.id} onHochgeladen={(a) => setAnhaenge([a, ...anhaenge])} />
              <AnhaengeListe anhaenge={anhaenge} onGeloescht={(id) => setAnhaenge(anhaenge.filter((a) => a.id !== id))} />
            </div>
          )}
        </div>
      </div>
    </>
  );
}
