"use client";

import { useCallback, useEffect, useState } from "react";
import type { Org } from "@opensoftware/openportal-core";
import type { PanelProps } from "./types.js";

export function TeamsPanel({ adapter }: PanelProps) {
  const [orgs, setOrgs] = useState<Org[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [newSlug, setNewSlug] = useState("");
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(() => {
    setErr(null);
    adapter.orgs
      .list()
      .then(setOrgs)
      .catch((e: unknown) => setErr(String((e as Error)?.message ?? e)));
  }, [adapter]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const createOrg = async () => {
    if (!newName || !newSlug) return;
    setBusy(true);
    try {
      await adapter.orgs.create({ name: newName, slug: newSlug });
      setNewName("");
      setNewSlug("");
      refresh();
    } catch (e) {
      setErr(String((e as Error)?.message ?? e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section data-openportal-panel="teams" className="p-4">
      <h2 className="text-xl font-semibold mb-4">Teams</h2>

      {err ? (
        <p className="text-sm text-red-600 mb-4">Error: {err}</p>
      ) : null}

      <div className="flex gap-2 mb-4">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Team name"
          className="border rounded px-2 py-1"
        />
        <input
          value={newSlug}
          onChange={(e) => setNewSlug(e.target.value)}
          placeholder="slug"
          className="border rounded px-2 py-1"
        />
        <button
          onClick={createOrg}
          disabled={busy}
          className="border rounded px-3 py-1 bg-black text-white disabled:opacity-50"
        >
          Create
        </button>
      </div>

      {orgs === null ? (
        <p className="text-sm text-gray-500">Loading…</p>
      ) : orgs.length === 0 ? (
        <p className="text-sm text-gray-500">No teams yet.</p>
      ) : (
        <ul className="space-y-1">
          {orgs.map((o) => (
            <li
              key={o.id}
              className="flex items-center justify-between border rounded px-3 py-2"
            >
              <div>
                <div className="font-medium">{o.name}</div>
                <div className="text-xs text-gray-500">{o.slug}</div>
              </div>
              <button
                onClick={async () => {
                  if (!confirm(`Delete team ${o.name}?`)) return;
                  await adapter.orgs.remove(o.id);
                  refresh();
                }}
                className="text-xs text-red-600 hover:underline"
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
