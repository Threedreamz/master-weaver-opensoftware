"use client";

import { useEffect, useState } from "react";
import {
  Plus, Trash2, Pencil, CheckSquare, FolderKanban, Shield,
  ArrowRight, GripVertical, X, Zap,
} from "lucide-react";

interface Item {
  id?: string;
  titel: string;
  beschreibung?: string;
  pflicht: boolean;
}

interface Vorlage {
  id: string;
  name: string;
  beschreibung: string | null;
  farbe: string;
  zugeordnetePipelines: string[];
  sichtbareGruppen: string[];
  triggerPipelineId: string | null;
  triggerStufeId: string | null;
  triggerBei: string;
  aktiv: boolean;
  items: Item[];
}

interface Pipeline { id: string; name: string; farbe: string | null; }
interface Stufe { id: string; name: string; position: number; }
interface Gruppe { id: string; name: string; farbe: string; }

const FARBEN = ["#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6", "#6366f1"];

export function ChecklistenVorlagenVerwaltung() {
  const [vorlagen, setVorlagen] = useState<Vorlage[]>([]);
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [gruppen, setGruppen] = useState<Gruppe[]>([]);
  const [loading, setLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  // Form
  const [formName, setFormName] = useState("");
  const [formBeschreibung, setFormBeschreibung] = useState("");
  const [formFarbe, setFormFarbe] = useState("#10b981");
  const [formPipelines, setFormPipelines] = useState<Set<string>>(new Set());
  const [formGruppen, setFormGruppen] = useState<Set<string>>(new Set());
  const [formItems, setFormItems] = useState<Item[]>([]);
  const [formTriggerPipeline, setFormTriggerPipeline] = useState("");
  const [formTriggerStufe, setFormTriggerStufe] = useState("");
  const [triggerStufen, setTriggerStufen] = useState<Stufe[]>([]);
  const [newItemTitel, setNewItemTitel] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      fetch("/api/checklisten-vorlagen").then((r) => r.json()),
      fetch("/api/pipelines").then((r) => r.json()),
      fetch("/api/gruppen").then((r) => r.json()),
    ]).then(([v, p, g]) => {
      setVorlagen(v);
      setPipelines(p);
      setGruppen(g);
    }).finally(() => setLoading(false));
  }, []);

  // Load stufen when trigger pipeline changes
  useEffect(() => {
    if (formTriggerPipeline) {
      fetch(`/api/pipelines/${formTriggerPipeline}/stufen`)
        .then((r) => r.json())
        .then((s: Stufe[]) => setTriggerStufen(s.sort((a, b) => a.position - b.position)));
    } else {
      setTriggerStufen([]);
      setFormTriggerStufe("");
    }
  }, [formTriggerPipeline]);

  function resetForm() {
    setFormName(""); setFormBeschreibung(""); setFormFarbe("#10b981");
    setFormPipelines(new Set()); setFormGruppen(new Set());
    setFormItems([]); setFormTriggerPipeline(""); setFormTriggerStufe("");
    setNewItemTitel(""); setError("");
  }

  function startEdit(v: Vorlage) {
    setEditId(v.id);
    setFormName(v.name);
    setFormBeschreibung(v.beschreibung || "");
    setFormFarbe(v.farbe);
    setFormPipelines(new Set(v.zugeordnetePipelines));
    setFormGruppen(new Set(v.sichtbareGruppen));
    setFormItems(v.items.map((i) => ({ ...i, pflicht: !!i.pflicht })));
    setFormTriggerPipeline(v.triggerPipelineId || "");
    setFormTriggerStufe(v.triggerStufeId || "");
    setShowForm(true);
  }

  function addItem() {
    if (!newItemTitel.trim()) return;
    setFormItems([...formItems, { titel: newItemTitel.trim(), pflicht: false }]);
    setNewItemTitel("");
  }

  function removeItem(idx: number) {
    setFormItems(formItems.filter((_, i) => i !== idx));
  }

  function togglePflicht(idx: number) {
    setFormItems(formItems.map((item, i) => i === idx ? { ...item, pflicht: !item.pflicht } : item));
  }

  async function speichern() {
    if (!formName) return;
    setSaving(true); setError("");

    const body = {
      name: formName,
      beschreibung: formBeschreibung || null,
      farbe: formFarbe,
      zugeordnetePipelines: Array.from(formPipelines),
      sichtbareGruppen: Array.from(formGruppen),
      triggerPipelineId: formTriggerPipeline || null,
      triggerStufeId: formTriggerStufe || null,
      triggerBei: "abgeschlossen",
      items: formItems,
    };

    const url = editId ? `/api/checklisten-vorlagen/${editId}` : "/api/checklisten-vorlagen";
    const method = editId ? "PATCH" : "POST";

    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (res.ok) {
      const vorlage = await res.json();
      if (editId) setVorlagen(vorlagen.map((v) => v.id === editId ? vorlage : v));
      else setVorlagen([...vorlagen, vorlage]);
      setShowForm(false); setEditId(null); resetForm();
    } else {
      const err = await res.json();
      setError(err.error || "Fehler");
    }
    setSaving(false);
  }

  async function loeschen(id: string) {
    if (!confirm("Checkliste wirklich loeschen?")) return;
    const res = await fetch(`/api/checklisten-vorlagen/${id}`, { method: "DELETE" });
    if (res.ok) setVorlagen(vorlagen.filter((v) => v.id !== id));
  }

  if (loading) return <div className="text-zinc-500 text-sm py-8 text-center">Lade...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-zinc-100 flex items-center gap-2">
            <CheckSquare className="w-5 h-5 text-emerald-400" />
            Checklisten-Vorlagen ({vorlagen.length})
          </h2>
          <p className="text-sm text-zinc-500 mt-1">Erstelle uebergreifende Checklisten, weise sie Pipelines und Gruppen zu, und definiere Trigger.</p>
        </div>
        <button
          onClick={() => { setShowForm(true); setEditId(null); resetForm(); }}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg bg-emerald-600 text-white hover:bg-emerald-500"
        >
          <Plus className="w-4 h-4" />
          Neue Checkliste
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-5 space-y-4">
          <h3 className="text-sm font-medium text-zinc-200">
            {editId ? "Checkliste bearbeiten" : "Neue Checkliste erstellen"}
          </h3>
          {error && <div className="text-xs text-red-400 bg-red-900/20 rounded px-3 py-2">{error}</div>}

          {/* Name + Beschreibung */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-zinc-400 block mb-1">Name *</label>
              <input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="z.B. Qualitaetskontrolle"
                className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-emerald-500" />
            </div>
            <div>
              <label className="text-xs text-zinc-400 block mb-1">Beschreibung</label>
              <input value={formBeschreibung} onChange={(e) => setFormBeschreibung(e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-emerald-500" />
            </div>
          </div>

          {/* Farbe */}
          <div>
            <label className="text-xs text-zinc-400 block mb-1">Farbe</label>
            <div className="flex gap-2">
              {FARBEN.map((f) => (
                <button key={f} onClick={() => setFormFarbe(f)}
                  className={`w-7 h-7 rounded-full border-2 ${formFarbe === f ? "border-white scale-110" : "border-transparent"}`}
                  style={{ backgroundColor: f }} />
              ))}
            </div>
          </div>

          {/* Checklist Items */}
          <div>
            <label className="text-xs text-zinc-400 block mb-1">Checklisten-Punkte ({formItems.length})</label>
            <div className="space-y-1 mb-2">
              {formItems.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2 bg-zinc-800 rounded px-3 py-1.5">
                  <GripVertical className="w-3 h-3 text-zinc-600" />
                  <CheckSquare className="w-3.5 h-3.5 text-zinc-500" />
                  <span className="text-sm text-zinc-200 flex-1">{item.titel}</span>
                  <button onClick={() => togglePflicht(idx)}
                    className={`text-[10px] px-1.5 py-0.5 rounded ${item.pflicht ? "bg-red-900/50 text-red-300" : "bg-zinc-700 text-zinc-500"}`}>
                    {item.pflicht ? "Pflicht" : "Optional"}
                  </button>
                  <button onClick={() => removeItem(idx)} className="p-0.5 hover:text-red-400 text-zinc-500">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input value={newItemTitel} onChange={(e) => setNewItemTitel(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addItem()}
                placeholder="Neuer Punkt..."
                className="flex-1 bg-zinc-800 border border-zinc-700 rounded px-3 py-1.5 text-sm text-zinc-100" />
              <button onClick={addItem} disabled={!newItemTitel.trim()}
                className="px-3 py-1.5 text-sm rounded bg-zinc-700 text-zinc-300 hover:bg-zinc-600 disabled:opacity-50">
                Hinzufuegen
              </button>
            </div>
          </div>

          {/* Pipeline-Zuordnung */}
          <div>
            <label className="text-xs text-zinc-400 block mb-1 flex items-center gap-1">
              <FolderKanban className="w-3 h-3" /> Zugeordnete Pipelines
              {formPipelines.size === 0 && <span className="text-zinc-500 ml-1">(alle)</span>}
            </label>
            <div className="flex flex-wrap gap-2">
              {pipelines.map((p) => (
                <button key={p.id} onClick={() => {
                  const next = new Set(formPipelines);
                  next.has(p.id) ? next.delete(p.id) : next.add(p.id);
                  setFormPipelines(next);
                }}
                  className={`text-xs px-2.5 py-1 rounded-lg border flex items-center gap-1 ${
                    formPipelines.has(p.id) ? "bg-blue-600 border-blue-500 text-white" : "bg-zinc-800 border-zinc-700 text-zinc-400"
                  }`}>
                  {p.farbe && <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.farbe }} />}
                  {p.name}
                </button>
              ))}
            </div>
          </div>

          {/* Gruppen-Sichtbarkeit */}
          <div>
            <label className="text-xs text-zinc-400 block mb-1 flex items-center gap-1">
              <Shield className="w-3 h-3" /> Sichtbar fuer Gruppen
              {formGruppen.size === 0 && <span className="text-zinc-500 ml-1">(alle)</span>}
            </label>
            <div className="flex flex-wrap gap-2">
              {gruppen.map((g) => (
                <button key={g.id} onClick={() => {
                  const next = new Set(formGruppen);
                  next.has(g.id) ? next.delete(g.id) : next.add(g.id);
                  setFormGruppen(next);
                }}
                  className={`text-xs px-2.5 py-1 rounded-lg border flex items-center gap-1 ${
                    formGruppen.has(g.id) ? "border-white/50 text-white" : "bg-zinc-800 border-zinc-700 text-zinc-400"
                  }`}
                  style={formGruppen.has(g.id) ? { backgroundColor: g.farbe } : undefined}>
                  {g.name}
                </button>
              ))}
              {gruppen.length === 0 && <span className="text-xs text-zinc-500">Noch keine Gruppen erstellt</span>}
            </div>
          </div>

          {/* Trigger */}
          <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-3">
            <label className="text-xs text-zinc-300 block mb-2 flex items-center gap-1">
              <Zap className="w-3 h-3 text-yellow-400" /> Trigger: Karte verschieben wenn Checkliste abgeschlossen
            </label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] text-zinc-500 block mb-1">Pipeline</label>
                <select value={formTriggerPipeline} onChange={(e) => setFormTriggerPipeline(e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-xs text-zinc-100">
                  <option value="">— Kein Trigger —</option>
                  {pipelines.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] text-zinc-500 block mb-1">Ziel-Stufe</label>
                <select value={formTriggerStufe} onChange={(e) => setFormTriggerStufe(e.target.value)}
                  disabled={!formTriggerPipeline}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-xs text-zinc-100 disabled:opacity-50">
                  <option value="">— Stufe waehlen —</option>
                  {triggerStufen.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            </div>
            {formTriggerPipeline && formTriggerStufe && (
              <p className="text-[10px] text-yellow-400/70 mt-2 flex items-center gap-1">
                <Zap className="w-3 h-3" />
                Wenn alle Punkte erledigt → Karte wird automatisch in "{triggerStufen.find((s) => s.id === formTriggerStufe)?.name}" verschoben
              </p>
            )}
          </div>

          {/* Buttons */}
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={() => { setShowForm(false); setEditId(null); resetForm(); }}
              className="px-3 py-1.5 text-sm rounded bg-zinc-800 text-zinc-300 hover:bg-zinc-700">Abbrechen</button>
            <button onClick={speichern} disabled={!formName || formItems.length === 0 || saving}
              className="px-3 py-1.5 text-sm rounded bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-50">
              {saving ? "Speichern..." : editId ? "Aktualisieren" : "Erstellen"}
            </button>
          </div>
        </div>
      )}

      {/* List */}
      {vorlagen.length === 0 && !showForm ? (
        <div className="text-center py-12 text-zinc-500">
          <CheckSquare className="w-10 h-10 mx-auto mb-3 text-zinc-600" />
          <p>Noch keine Checklisten-Vorlagen erstellt.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {vorlagen.map((v) => (
            <div key={v.id} className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: v.farbe }} />
                  <div>
                    <span className="text-sm font-medium text-zinc-100">{v.name}</span>
                    {v.beschreibung && <p className="text-xs text-zinc-500">{v.beschreibung}</p>}
                  </div>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400">
                    {v.items.length} Punkte
                  </span>
                  {!v.aktiv && <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-600">Inaktiv</span>}
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => startEdit(v)} className="p-1.5 rounded hover:bg-zinc-800 text-zinc-500 hover:text-zinc-200">
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button onClick={() => loeschen(v.id)} className="p-1.5 rounded hover:bg-red-900/30 text-zinc-500 hover:text-red-400">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Items preview */}
              <div className="mt-2 space-y-0.5">
                {v.items.slice(0, 5).map((item, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs text-zinc-400">
                    <CheckSquare className="w-3 h-3 text-zinc-600" />
                    <span>{item.titel}</span>
                    {item.pflicht && <span className="text-[9px] text-red-400">Pflicht</span>}
                  </div>
                ))}
                {v.items.length > 5 && <span className="text-[10px] text-zinc-600 ml-5">+{v.items.length - 5} weitere</span>}
              </div>

              {/* Tags */}
              <div className="flex flex-wrap gap-1 mt-2">
                {v.zugeordnetePipelines.length > 0 ? (
                  v.zugeordnetePipelines.map((pId) => {
                    const p = pipelines.find((pp) => pp.id === pId);
                    return <span key={pId} className="text-[9px] px-1.5 py-0.5 rounded bg-blue-900/30 text-blue-300">{p?.name || "?"}</span>;
                  })
                ) : (
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-green-900/30 text-green-400">Alle Pipelines</span>
                )}
                {v.sichtbareGruppen.length > 0 && v.sichtbareGruppen.map((gId) => {
                  const g = gruppen.find((gg) => gg.id === gId);
                  return <span key={gId} className="text-[9px] px-1.5 py-0.5 rounded text-white" style={{ backgroundColor: g?.farbe || "#666" }}>{g?.name || "?"}</span>;
                })}
                {v.triggerStufeId && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-yellow-900/30 text-yellow-300 flex items-center gap-0.5">
                    <Zap className="w-2.5 h-2.5" /> Trigger aktiv
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
