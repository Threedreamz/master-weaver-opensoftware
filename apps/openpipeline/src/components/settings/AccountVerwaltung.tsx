"use client";

import { useEffect, useState } from "react";
import { UserPlus, Trash2, Shield, Eye, Pencil, Users, Mail, Check, X } from "lucide-react";

interface User {
  id: string;
  email: string;
  name: string | null;
  display_name: string | null;
  role: string;
  created_at: number;
}

const ROLE_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode; beschreibung: string }> = {
  admin: {
    label: "Admin",
    color: "bg-red-900/50 text-red-300 border-red-800",
    icon: <Shield className="w-3 h-3" />,
    beschreibung: "Voller Zugriff auf alles — Accounts, Pipelines, Einstellungen",
  },
  editor: {
    label: "Editor",
    color: "bg-blue-900/50 text-blue-300 border-blue-800",
    icon: <Pencil className="w-3 h-3" />,
    beschreibung: "Kann Pipelines und Karten erstellen und bearbeiten",
  },
  viewer: {
    label: "Viewer",
    color: "bg-zinc-800 text-zinc-300 border-zinc-700",
    icon: <Eye className="w-3 h-3" />,
    beschreibung: "Nur Lesen — kann Pipelines und Karten ansehen",
  },
  guest: {
    label: "Gast",
    color: "bg-zinc-800/50 text-zinc-500 border-zinc-700",
    icon: <Eye className="w-3 h-3" />,
    beschreibung: "Eingeschraenkter Zugriff",
  },
};

export function AccountVerwaltung() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNeu, setShowNeu] = useState(false);

  // Form
  const [neuEmail, setNeuEmail] = useState("");
  const [neuName, setNeuName] = useState("");
  const [neuRole, setNeuRole] = useState("editor");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Inline edit
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editRole, setEditRole] = useState("");

  useEffect(() => {
    fetch("/api/users")
      .then((r) => r.json())
      .then(setUsers)
      .finally(() => setLoading(false));
  }, []);

  async function erstellen() {
    if (!neuEmail) return;
    setSaving(true);
    setError("");
    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: neuEmail, name: neuName || null, role: neuRole }),
    });
    if (res.ok) {
      const user = await res.json();
      setUsers([user, ...users]);
      setNeuEmail("");
      setNeuName("");
      setNeuRole("editor");
      setShowNeu(false);
    } else {
      const err = await res.json();
      setError(err.error || "Fehler beim Erstellen");
    }
    setSaving(false);
  }

  function startEdit(user: User) {
    setEditingId(user.id);
    setEditName(user.name || user.display_name || "");
    setEditRole(user.role);
  }

  async function speichernEdit(id: string) {
    const res = await fetch(`/api/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editName, role: editRole }),
    });
    if (res.ok) {
      const updated = await res.json();
      setUsers(users.map((u) => (u.id === id ? updated : u)));
      setEditingId(null);
    }
  }

  async function loeschen(id: string) {
    if (!confirm("Account wirklich loeschen? Der User verliert Zugriff auf alle Pipelines.")) return;
    const res = await fetch(`/api/users/${id}`, { method: "DELETE" });
    if (res.ok) {
      setUsers(users.filter((u) => u.id !== id));
    }
  }

  if (loading) {
    return <div className="text-zinc-500 text-sm py-8 text-center">Lade Accounts...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-zinc-100 flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-400" />
            Accounts ({users.length})
          </h2>
          <p className="text-sm text-zinc-500 mt-1">Erstelle und verwalte User-Accounts und ihre App-Berechtigungen.</p>
        </div>
        <button
          onClick={() => setShowNeu(!showNeu)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-500"
        >
          <UserPlus className="w-4 h-4" />
          Neuer Account
        </button>
      </div>

      {/* Rollen-Uebersicht */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Object.entries(ROLE_CONFIG).map(([key, cfg]) => {
          const count = users.filter((u) => u.role === key).length;
          return (
            <div key={key} className={`rounded-lg border p-3 ${cfg.color}`}>
              <div className="flex items-center gap-1.5 text-sm font-medium">
                {cfg.icon}
                {cfg.label}
                <span className="ml-auto text-xs opacity-70">{count}</span>
              </div>
              <p className="text-[10px] mt-1 opacity-70">{cfg.beschreibung}</p>
            </div>
          );
        })}
      </div>

      {/* Neuer Account Form */}
      {showNeu && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 space-y-3">
          <h3 className="text-sm font-medium text-zinc-200">Neuen Account erstellen</h3>

          {error && (
            <div className="text-xs text-red-400 bg-red-900/20 rounded px-3 py-2">{error}</div>
          )}

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-zinc-400 block mb-1">Email *</label>
              <input
                type="email"
                value={neuEmail}
                onChange={(e) => setNeuEmail(e.target.value)}
                placeholder="user@beispiel.de"
                className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="text-xs text-zinc-400 block mb-1">Name</label>
              <input
                value={neuName}
                onChange={(e) => setNeuName(e.target.value)}
                placeholder="Max Mustermann"
                className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="text-xs text-zinc-400 block mb-1">Berechtigung</label>
              <select
                value={neuRole}
                onChange={(e) => setNeuRole(e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-100"
              >
                <option value="admin">Admin — Voller Zugriff</option>
                <option value="editor">Editor — Erstellen & Bearbeiten</option>
                <option value="viewer">Viewer — Nur Lesen</option>
                <option value="guest">Gast — Eingeschraenkt</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <button
              onClick={() => { setShowNeu(false); setError(""); }}
              className="px-3 py-1.5 text-sm rounded bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
            >
              Abbrechen
            </button>
            <button
              onClick={erstellen}
              disabled={!neuEmail || saving}
              className="px-3 py-1.5 text-sm rounded bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-50"
            >
              {saving ? "Erstellen..." : "Account erstellen"}
            </button>
          </div>
        </div>
      )}

      {/* User-Liste */}
      <div className="space-y-2">
        {users.map((user) => {
          const roleCfg = ROLE_CONFIG[user.role] || ROLE_CONFIG.viewer;
          const isEditing = editingId === user.id;

          return (
            <div key={user.id} className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-full bg-zinc-700 flex items-center justify-center text-sm font-medium text-zinc-200 shrink-0">
                    {(user.display_name || user.name || user.email).charAt(0).toUpperCase()}
                  </div>

                  {/* Info */}
                  <div className="min-w-0">
                    {isEditing ? (
                      <input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="bg-zinc-800 border border-zinc-600 rounded px-2 py-0.5 text-sm text-zinc-100 w-48"
                        autoFocus
                      />
                    ) : (
                      <div className="text-sm font-medium text-zinc-100 truncate">
                        {user.display_name || user.name || user.email.split("@")[0]}
                      </div>
                    )}
                    <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                      <Mail className="w-3 h-3" />
                      {user.email}
                    </div>
                  </div>
                </div>

                {/* Role + Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  {isEditing ? (
                    <>
                      <select
                        value={editRole}
                        onChange={(e) => setEditRole(e.target.value)}
                        className="bg-zinc-800 border border-zinc-600 rounded px-2 py-1 text-xs text-zinc-100"
                      >
                        <option value="admin">Admin</option>
                        <option value="editor">Editor</option>
                        <option value="viewer">Viewer</option>
                        <option value="guest">Gast</option>
                      </select>
                      <button
                        onClick={() => speichernEdit(user.id)}
                        className="p-1.5 rounded hover:bg-green-900/30 text-green-400"
                        title="Speichern"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="p-1.5 rounded hover:bg-zinc-800 text-zinc-400"
                        title="Abbrechen"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </>
                  ) : (
                    <>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border flex items-center gap-1 ${roleCfg.color}`}>
                        {roleCfg.icon}
                        {roleCfg.label}
                      </span>
                      <button
                        onClick={() => startEdit(user)}
                        className="p-1.5 rounded hover:bg-zinc-800 text-zinc-500 hover:text-zinc-200"
                        title="Bearbeiten"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => loeschen(user.id)}
                        className="p-1.5 rounded hover:bg-red-900/30 text-zinc-500 hover:text-red-400"
                        title="Loeschen"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {users.length === 0 && (
          <div className="text-center py-12 text-zinc-500">
            <Users className="w-10 h-10 mx-auto mb-3 text-zinc-600" />
            <p>Noch keine Accounts vorhanden.</p>
          </div>
        )}
      </div>
    </div>
  );
}
