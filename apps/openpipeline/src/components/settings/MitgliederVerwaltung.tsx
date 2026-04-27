"use client";

import { useEffect, useState } from "react";
import { UserPlus, Trash2, Shield, Users, Info, ChevronDown } from "lucide-react";

interface Mitglied {
  id: string;
  userId: string;
  name: string | null;
  rolle: string;
  vertrauensLevel: number;
  zugewieseneStufen: string[] | null;
}

interface User {
  id: string;
  email: string;
  name: string | null;
  display_name: string | null;
  role: string;
}

interface Stufe {
  id: string;
  name: string;
}

interface Props {
  pipelineId: string;
  stufen: Stufe[];
}

const VERTRAUENS_LABELS: Record<number, string> = {
  1: "Basis",
  2: "Erweitert",
  3: "Voll",
};

export function MitgliederVerwaltung({ pipelineId, stufen }: Props) {
  const [mitglieder, setMitglieder] = useState<Mitglied[]>([]);
  const [alleUser, setAlleUser] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showHinzufuegen, setShowHinzufuegen] = useState(false);

  // Neues Mitglied Form
  const [neuerUserId, setNeuerUserId] = useState("");
  const [neueRolle, setNeueRolle] = useState("zuarbeiter");
  const [neueStufen, setNeueStufen] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const [mitgliederRes, usersRes] = await Promise.all([
        fetch(`/api/pipelines/${pipelineId}/mitglieder`, { headers: { "X-User-Id": "steffen" } }),
        fetch("/api/users"),
      ]);
      if (mitgliederRes.ok) setMitglieder(await mitgliederRes.json());
      if (usersRes.ok) setAlleUser(await usersRes.json());
      setLoading(false);
    }
    load();
  }, [pipelineId]);

  const mitgliedUserIds = new Set(mitglieder.map((m) => m.userId));
  const verfuegbareUser = alleUser.filter((u) => !mitgliedUserIds.has(u.id));

  function getUserDisplay(userId: string): { name: string; email: string } {
    const user = alleUser.find((u) => u.id === userId);
    return {
      name: user?.display_name || user?.name || user?.email?.split("@")[0] || userId.slice(0, 8),
      email: user?.email || "",
    };
  }

  async function hinzufuegen() {
    if (!neuerUserId) return;
    setSaving(true);
    const user = alleUser.find((u) => u.id === neuerUserId);
    const res = await fetch(`/api/pipelines/${pipelineId}/mitglieder`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-User-Id": "steffen" },
      body: JSON.stringify({
        userId: neuerUserId,
        name: user?.display_name || user?.name || user?.email || null,
        rolle: neueRolle,
        zugewieseneStufen: neueRolle === "zuarbeiter" && neueStufen.length > 0 ? neueStufen : null,
      }),
    });
    if (res.ok) {
      const neu = await res.json();
      setMitglieder([...mitglieder, neu]);
      setNeuerUserId("");
      setNeueStufen([]);
      setShowHinzufuegen(false);
    }
    setSaving(false);
  }

  async function rolleAendern(userId: string, rolle: string) {
    const res = await fetch(`/api/pipelines/${pipelineId}/mitglieder/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "X-User-Id": "steffen" },
      body: JSON.stringify({ rolle }),
    });
    if (res.ok) {
      setMitglieder(mitglieder.map((m) => m.userId === userId ? { ...m, rolle } : m));
    }
  }

  async function vertrauenAendern(userId: string, vertrauensLevel: number) {
    const res = await fetch(`/api/pipelines/${pipelineId}/mitglieder/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "X-User-Id": "steffen" },
      body: JSON.stringify({ vertrauensLevel }),
    });
    if (res.ok) {
      setMitglieder(mitglieder.map((m) => m.userId === userId ? { ...m, vertrauensLevel } : m));
    }
  }

  async function stufenAendern(userId: string, zugewieseneStufen: string[]) {
    const res = await fetch(`/api/pipelines/${pipelineId}/mitglieder/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "X-User-Id": "steffen" },
      body: JSON.stringify({ zugewieseneStufen: zugewieseneStufen.length > 0 ? zugewieseneStufen : null }),
    });
    if (res.ok) {
      setMitglieder(mitglieder.map((m) =>
        m.userId === userId ? { ...m, zugewieseneStufen: zugewieseneStufen.length > 0 ? zugewieseneStufen : null } : m
      ));
    }
  }

  async function entfernen(userId: string) {
    if (!confirm("Mitglied wirklich entfernen?")) return;
    const res = await fetch(`/api/pipelines/${pipelineId}/mitglieder/${userId}`, {
      method: "DELETE",
      headers: { "X-User-Id": "steffen" },
    });
    if (res.ok) {
      setMitglieder(mitglieder.filter((m) => m.userId !== userId));
    }
  }

  if (loading) {
    return <div className="text-zinc-500 text-sm py-8 text-center">Lade Mitglieder...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-blue-400" />
          <h2 className="text-lg font-semibold text-zinc-100">Mitglieder ({mitglieder.length})</h2>
        </div>
        <button
          onClick={() => setShowHinzufuegen(!showHinzufuegen)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-500"
        >
          <UserPlus className="w-4 h-4" />
          Mitglied hinzufuegen
        </button>
      </div>

      {/* Info Box */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 text-sm text-zinc-400">
        <div className="flex items-start gap-2">
          <Info className="w-4 h-4 mt-0.5 text-blue-400 shrink-0" />
          <div>
            <p className="text-zinc-300 font-medium mb-1">Rollen-Erklaerung</p>
            <p><strong className="text-zinc-200">Vorgesetzter:</strong> Voller Zugriff — kann Mitglieder, Stufen, Automatisierungen und alle Karten verwalten.</p>
            <p className="mt-1"><strong className="text-zinc-200">Zuarbeiter:</strong> Kann Karten in zugewiesenen Stufen bearbeiten. Ohne Stufen-Zuweisung: Zugriff auf alle Stufen.</p>
            <p className="mt-1"><strong className="text-zinc-200">Vertrauensstufe:</strong> 1 = Basis (eingeschraenkt), 2 = Erweitert, 3 = Voll (selbststaendig)</p>
          </div>
        </div>
      </div>

      {/* Hinzufuegen Form */}
      {showHinzufuegen && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 space-y-3">
          <h3 className="text-sm font-medium text-zinc-200">Neues Mitglied hinzufuegen</h3>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-zinc-400 block mb-1">User</label>
              <select
                value={neuerUserId}
                onChange={(e) => setNeuerUserId(e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-100"
              >
                <option value="">— User waehlen —</option>
                {verfuegbareUser.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.display_name || u.name || u.email} ({u.email})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs text-zinc-400 block mb-1">Rolle</label>
              <select
                value={neueRolle}
                onChange={(e) => setNeueRolle(e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-100"
              >
                <option value="zuarbeiter">Zuarbeiter</option>
                <option value="vorgesetzter">Vorgesetzter</option>
              </select>
            </div>
          </div>

          {neueRolle === "zuarbeiter" && (
            <div>
              <label className="text-xs text-zinc-400 block mb-1">Zugewiesene Stufen (optional — leer = alle)</label>
              <div className="flex flex-wrap gap-2">
                {stufen.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => {
                      setNeueStufen(
                        neueStufen.includes(s.id)
                          ? neueStufen.filter((id) => id !== s.id)
                          : [...neueStufen, s.id]
                      );
                    }}
                    className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                      neueStufen.includes(s.id)
                        ? "bg-blue-600 border-blue-500 text-white"
                        : "bg-zinc-800 border-zinc-700 text-zinc-300 hover:border-zinc-500"
                    }`}
                  >
                    {s.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <button
              onClick={() => setShowHinzufuegen(false)}
              className="px-3 py-1.5 text-sm rounded bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
            >
              Abbrechen
            </button>
            <button
              onClick={hinzufuegen}
              disabled={!neuerUserId || saving}
              className="px-3 py-1.5 text-sm rounded bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-50"
            >
              {saving ? "Speichern..." : "Hinzufuegen"}
            </button>
          </div>
        </div>
      )}

      {/* Mitglieder-Liste */}
      {mitglieder.length === 0 ? (
        <div className="text-center py-12 text-zinc-500">
          <Users className="w-10 h-10 mx-auto mb-3 text-zinc-600" />
          <p>Noch keine Mitglieder in dieser Pipeline.</p>
          <p className="text-sm mt-1">Fuege das erste Mitglied hinzu um loszulegen.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {mitglieder.map((m) => {
            const display = getUserDisplay(m.userId);
            return (
              <div key={m.id} className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
                <div className="flex items-start justify-between">
                  {/* User Info */}
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-zinc-700 flex items-center justify-center text-sm font-medium text-zinc-200">
                      {display.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-zinc-100">{m.name || display.name}</span>
                        {m.rolle === "vorgesetzter" && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-900/50 text-amber-300 flex items-center gap-0.5">
                            <Shield className="w-3 h-3" /> Vorgesetzter
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-zinc-500">{display.email}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <button
                    onClick={() => entfernen(m.userId)}
                    className="p-1.5 rounded hover:bg-red-900/30 text-zinc-500 hover:text-red-400"
                    title="Entfernen"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Settings Row */}
                <div className="mt-3 grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-[10px] text-zinc-500 block mb-1">Rolle</label>
                    <select
                      value={m.rolle}
                      onChange={(e) => rolleAendern(m.userId, e.target.value)}
                      className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-xs text-zinc-100"
                    >
                      <option value="vorgesetzter">Vorgesetzter</option>
                      <option value="zuarbeiter">Zuarbeiter</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] text-zinc-500 block mb-1">Vertrauensstufe</label>
                    <select
                      value={m.vertrauensLevel}
                      onChange={(e) => vertrauenAendern(m.userId, parseInt(e.target.value))}
                      className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-xs text-zinc-100"
                    >
                      <option value={1}>1 — Basis</option>
                      <option value={2}>2 — Erweitert</option>
                      <option value={3}>3 — Voll</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] text-zinc-500 block mb-1">
                      Stufen {m.rolle === "vorgesetzter" ? "(alle)" : ""}
                    </label>
                    {m.rolle === "vorgesetzter" ? (
                      <span className="text-xs text-zinc-500 italic">Alle Stufen</span>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {stufen.map((s) => {
                          const assigned = m.zugewieseneStufen?.includes(s.id) ?? false;
                          const noRestriction = !m.zugewieseneStufen || m.zugewieseneStufen.length === 0;
                          return (
                            <button
                              key={s.id}
                              onClick={() => {
                                const current = m.zugewieseneStufen ?? [];
                                const updated = assigned
                                  ? current.filter((id) => id !== s.id)
                                  : [...current, s.id];
                                stufenAendern(m.userId, updated);
                              }}
                              className={`text-[10px] px-1.5 py-0.5 rounded-full border transition-colors ${
                                assigned
                                  ? "bg-blue-600 border-blue-500 text-white"
                                  : noRestriction
                                    ? "bg-zinc-800/50 border-zinc-700/50 text-zinc-500"
                                    : "bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-500"
                              }`}
                              title={noRestriction && !assigned ? "Alle Stufen (keine Einschraenkung)" : s.name}
                            >
                              {s.name}
                            </button>
                          );
                        })}
                        {(!m.zugewieseneStufen || m.zugewieseneStufen.length === 0) && (
                          <span className="text-[10px] text-zinc-500 ml-1">(alle)</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
