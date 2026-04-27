"use client";

import { useEffect, useState } from "react";
import type { AuditLogEntry } from "@opensoftware/openportal-core";
import type { PanelProps } from "./types.js";

export function AuditPanel({ adapter, orgId }: PanelProps) {
  const [entries, setEntries] = useState<AuditLogEntry[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!orgId) return;
    setErr(null);
    adapter.audit
      .list(orgId, { limit: 200 })
      .then(setEntries)
      .catch((e: unknown) => setErr(String((e as Error)?.message ?? e)));
  }, [adapter, orgId]);

  if (!orgId) {
    return (
      <section className="p-4">
        <h2 className="text-xl font-semibold mb-2">Audit Log</h2>
        <p className="text-sm text-gray-500">Select a team first.</p>
      </section>
    );
  }

  return (
    <section data-openportal-panel="audit" className="p-4">
      <h2 className="text-xl font-semibold mb-4">Audit Log</h2>
      {err ? <p className="text-sm text-red-600 mb-4">Error: {err}</p> : null}

      {entries === null ? (
        <p className="text-sm text-gray-500">Loading…</p>
      ) : entries.length === 0 ? (
        <p className="text-sm text-gray-500">No audit entries.</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left border-b">
              <th className="py-1 pr-3">When</th>
              <th className="py-1 pr-3">Actor</th>
              <th className="py-1 pr-3">Action</th>
              <th className="py-1 pr-3">Target</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e) => (
              <tr key={e.id} className="border-b last:border-b-0">
                <td className="py-1 pr-3 text-gray-500">
                  {new Date(e.createdAt).toLocaleString()}
                </td>
                <td className="py-1 pr-3">{e.actorId ?? "—"}</td>
                <td className="py-1 pr-3">{e.action}</td>
                <td className="py-1 pr-3 text-gray-500">{e.target}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
