"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, Shield, Check, X, Pencil, FolderKanban } from "lucide-react";

interface Pipeline {
  id: string;
  name: string;
  farbe: string | null;
}

interface Gruppe {
  id: string;
  name: string;
  beschreibung: string | null;
  farbe: string;
  berechtigungen: string[];
  erlaubtePipelines: string[];
}

const PERMISSION_GROUPS = [
  {
    label: "Pipelines",
    permissions: [
      { key: "pipeline:pipelines:read", label: "Pipelines ansehen" },
      { key: "pipeline:pipelines:write", label: "Pipelines erstellen/bearbeiten" },
    ],
  },
  {
    label: "Karten",
    permissions: [
      { key: "pipeline:karten:read", label: "Karten ansehen" },
      { key: "pipeline:karten:write", label: "Karten erstellen/bearbeiten" },
      { key: "pipeline:karten:move", label: "Karten verschieben" },
    ],
  },
  {
    label: "Stufen",
    permissions: [
      { key: "pipeline:stufen:read", label: "Stufen ansehen" },
      { key: "pipeline:stufen:write", label: "Stufen erstellen/bearbeiten" },
    ],
  },
  {
    label: "Labels & Custom Fields",
    permissions: [
      { key: "pipeline:labels:read", label: "Labels ansehen" },
      { key: "pipeline:labels:write", label: "Labels verwalten" },
      { key: "pipeline:custom-fields:read", label: "Custom Fields ansehen" },
      { key: "pipeline:custom-fields:write", label: "Custom Fields verwalten" },
    ],
  },
  {
    label: "Team",
    permissions: [
      { key: "pipeline:mitglieder:read", label: "Mitglieder ansehen" },
      { key: "pipeline:mitglieder:write", label: "Mitglieder verwalten" },
      { key: "pipeline:kommentare:read", label: "Kommentare lesen" },
      { key: "pipeline:kommentare:write", label: "Kommentare schreiben" },
    ],
  },
  {
    label: "Dateien & Vorlagen",
    permissions: [
      { key: "pipeline:anhaenge:read", label: "Anhaenge ansehen" },
      { key: "pipeline:anhaenge:write", label: "Anhaenge hochladen" },
      { key: "pipeline:vorlagen:read", label: "Vorlagen ansehen" },
      { key: "pipeline:vorlagen:write", label: "Vorlagen erstellen" },
    ],
  },
  {
    label: "Automatisierung",
    permissions: [
      { key: "pipeline:automatisierungen:read", label: "Automatisierungen ansehen" },
      { key: "pipeline:automatisierungen:write", label: "Automatisierungen verwalten" },
    ],
  },
];

const FARBEN = ["#6366f1", "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6"];

export function GruppenVerwaltung() {
  const [gruppen, setGruppen] = useState<Gruppe[]>([]);
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNeu, setShowNeu] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  // Form state
  const [formName, setFormName] = useState("");
  const [formBeschreibung, setFormBeschreibung] = useState("");
  const [formFarbe, setFormFarbe] = useState("#6366f1");
  const [formPerms, setFormPerms] = useState<Set<string>>(new Set());
  const [formPipelines, setFormPipelines] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      fetch("/api/gruppen").then((r) => r.json()),
      fetch("/api/pipelines").then((r) => r.json()),
    ]).then(([g, p]) => {
      setGruppen(g);
      setPipelines(p);
    }).finally(() => setLoading(false));
  }, []);

  function resetForm() {
    setFormName("");
    setFormBeschreibung("");
    setFormFarbe("#6366f1");
    setFormPerms(new Set());
    setFormPipelines(new Set());
    setError("");
  }

  function startEdit(g: Gruppe) {
    setEditId(g.id);
    setFormName(g.name);
    setFormBeschreibung(g.beschreibung || "");
    setFormFarbe(g.farbe);
    setFormPerms(new Set(g.berechtigungen));
    setFormPipelines(new Set(g.erlaubtePipelines || []));
    setShowNeu(true);
  }

  function togglePerm(key: string) {
    const next = new Set(formPerms);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setFormPerms(next);
  }

  function selectAll() {
    const all = new Set<string>();
    PERMISSION_GROUPS.forEach((g) => g.permissions.forEach((p) => all.add(p.key)));
    setFormPerms(all);
  }

  function selectNone() {
    setFormPerms(new Set());
  }

  async function speichern() {
    if (!formName) return;
    setSaving(true);
    setError("");

    const body = {
      name: formName,
      beschreibung: formBeschreibung || null,
      farbe: formFarbe,
      berechtigungen: Array.from(formPerms),
      erlaubtePipelines: Array.from(formPipelines),
    };

    const url = editId ? `/api/gruppen/${editId}` : "/api/gruppen";
    const method = editId ? "PATCH" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      const gruppe = await res.json();
      if (editId) {
        setGruppen(gruppen.map((g) => g.id === editId ? gruppe : g));
      } else {
        setGruppen([...gruppen, gruppe]);
      }
      setShowNeu(false);
      setEditId(null);
      resetForm();
    } else {
      const err = await res.json();
      setError(err.error || "Fehler");
    }
    setSaving(false);
  }

  async function loeschen(id: string) {
    if (!confirm("Berechtigungsgruppe wirklich loeschen?")) return;
    const res = await fetch(`/api/gruppen/${id}`, { method: "DELETE" });
    if (res.ok) setGruppen(gruppen.filter((g) => g.id !== id));
  }

  if (loading) {
    return <div className="text-zinc-500 text-sm py-8 text-center">Lade Gruppen...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-zinc-100 flex items-center gap-2">
            <Shield className="w-5 h-5 text-blue-400" />
            Berechtigungsgruppen ({gruppen.length})
          </h2>
          <p className="text-sm text-zinc-500 mt-1">Erstelle Gruppen mit spezifischen Berechtigungen und weise sie Accounts zu.</p>
        </div>
        <button
          onClick={() => { setShowNeu(true); setEditId(null); resetForm(); }}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-500"
        >
          <Plus className="w-4 h-4" />
          Neue Gruppe
        </button>
      </div>

      {/* Create/Edit Form */}
      {showNeu && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 space-y-4">
          <h3 className="text-sm font-medium text-zinc-200">
            {editId ? "Gruppe bearbeiten" : "Neue Berechtigungsgruppe"}
          </h3>

          {error && <div className="text-xs text-red-400 bg-red-900/20 rounded px-3 py-2">{error}</div>}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-zinc-400 block mb-1">Name *</label>
              <input
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="z.B. Vertrieb, Produktion"
                className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="text-xs text-zinc-400 block mb-1">Beschreibung</label>
              <input
                value={formBeschreibung}
                onChange={(e) => setFormBeschreibung(e.target.value)}
                placeholder="Was darf diese Gruppe?"
                className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Color Picker */}
          <div>
            <label className="text-xs text-zinc-400 block mb-1">Farbe</label>
            <div className="flex gap-2">
              {FARBEN.map((f) => (
                <button
                  key={f}
                  onClick={() => setFormFarbe(f)}
                  className={`w-7 h-7 rounded-full border-2 transition-all ${formFarbe === f ? "border-white scale-110" : "border-transparent"}`}
                  style={{ backgroundColor: f }}
                />
              ))}
            </div>
          </div>

          {/* Permissions */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs text-zinc-400">Berechtigungen ({formPerms.size})</label>
              <div className="flex gap-2">
                <button onClick={selectAll} className="text-[10px] text-blue-400 hover:text-blue-300">Alle</button>
                <button onClick={selectNone} className="text-[10px] text-zinc-500 hover:text-zinc-300">Keine</button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {PERMISSION_GROUPS.map((group) => (
                <div key={group.label} className="space-y-1">
                  <span className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider">{group.label}</span>
                  {group.permissions.map((p) => (
                    <label key={p.key} className="flex items-center gap-2 cursor-pointer text-xs text-zinc-300 hover:text-zinc-100">
                      <input
                        type="checkbox"
                        checked={formPerms.has(p.key)}
                        onChange={() => togglePerm(p.key)}
                        className="rounded bg-zinc-700 border-zinc-600 text-blue-500"
                      />
                      {p.label}
                    </label>
                  ))}
                </div>
              ))}
            </div>
          </div>

          {/* Pipeline Access */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs text-zinc-400 flex items-center gap-1">
                <FolderKanban className="w-3 h-3" />
                Pipeline-Zugriff
                {formPipelines.size === 0 && <span className="text-zinc-500 ml-1">(alle Pipelines)</span>}
              </label>
              <button
                onClick={() => setFormPipelines(new Set())}
                className="text-[10px] text-zinc-500 hover:text-zinc-300"
              >
                Alle erlauben
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {pipelines.map((p) => {
                const selected = formPipelines.has(p.id);
                const noRestriction = formPipelines.size === 0;
                return (
                  <button
                    key={p.id}
                    onClick={() => {
                      const next = new Set(formPipelines);
                      if (next.has(p.id)) next.delete(p.id);
                      else next.add(p.id);
                      setFormPipelines(next);
                    }}
                    className={`text-xs px-3 py-1.5 rounded-lg border flex items-center gap-1.5 transition-colors ${
                      selected
                        ? "bg-blue-600 border-blue-500 text-white"
                        : noRestriction
                          ? "bg-zinc-800/50 border-zinc-700/50 text-zinc-400"
                          : "bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-500"
                    }`}
                  >
                    {p.farbe && <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.farbe }} />}
                    {p.name}
                  </button>
                );
              })}
            </div>
            <p className="text-[10px] text-zinc-600 mt-1">
              Keine Auswahl = Zugriff auf alle Pipelines. Auswahl = nur diese Pipelines sichtbar.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={() => { setShowNeu(false); setEditId(null); resetForm(); }}
              className="px-3 py-1.5 text-sm rounded bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
            >
              Abbrechen
            </button>
            <button
              onClick={speichern}
              disabled={!formName || saving}
              className="px-3 py-1.5 text-sm rounded bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-50"
            >
              {saving ? "Speichern..." : editId ? "Aktualisieren" : "Erstellen"}
            </button>
          </div>
        </div>
      )}

      {/* Groups List */}
      {gruppen.length === 0 && !showNeu ? (
        <div className="text-center py-12 text-zinc-500">
          <Shield className="w-10 h-10 mx-auto mb-3 text-zinc-600" />
          <p>Noch keine Berechtigungsgruppen erstellt.</p>
          <p className="text-sm mt-1">Erstelle Gruppen wie "Vertrieb", "Produktion" oder "Buchhaltung".</p>
        </div>
      ) : (
        <div className="space-y-2">
          {gruppen.map((g) => (
            <div key={g.id} className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: g.farbe }} />
                  <div>
                    <span className="text-sm font-medium text-zinc-100">{g.name}</span>
                    {g.beschreibung && <p className="text-xs text-zinc-500">{g.beschreibung}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-zinc-500 mr-2">{g.berechtigungen.length} Berechtigungen</span>
                  <button
                    onClick={() => startEdit(g)}
                    className="p-1.5 rounded hover:bg-zinc-800 text-zinc-500 hover:text-zinc-200"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => loeschen(g.id)}
                    className="p-1.5 rounded hover:bg-red-900/30 text-zinc-500 hover:text-red-400"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              {/* Pipeline access */}
              {g.erlaubtePipelines && g.erlaubtePipelines.length > 0 ? (
                <div className="flex flex-wrap gap-1 mt-2">
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-900/30 text-blue-300 flex items-center gap-1">
                    <FolderKanban className="w-2.5 h-2.5" />
                    {g.erlaubtePipelines.length} Pipeline{g.erlaubtePipelines.length !== 1 ? "s" : ""}
                  </span>
                  {g.erlaubtePipelines.map((pId) => {
                    const p = pipelines.find((pp) => pp.id === pId);
                    return (
                      <span key={pId} className="text-[9px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400">
                        {p?.name || pId.slice(0, 8)}
                      </span>
                    );
                  })}
                </div>
              ) : (
                <div className="flex gap-1 mt-2">
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-green-900/30 text-green-400">Alle Pipelines</span>
                </div>
              )}
              {/* Permission tags */}
              <div className="flex flex-wrap gap-1 mt-1">
                {g.berechtigungen.slice(0, 6).map((p) => (
                  <span key={p} className="text-[9px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400">
                    {p.split(":").slice(1).join(":")}
                  </span>
                ))}
                {g.berechtigungen.length > 6 && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-500">
                    +{g.berechtigungen.length - 6}
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
