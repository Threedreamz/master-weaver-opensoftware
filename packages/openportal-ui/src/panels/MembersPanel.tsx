"use client";

import { useCallback, useEffect, useState } from "react";
import type { Invitation, OrgMember, OrgRole } from "@opensoftware/openportal-core";
import type { PanelProps } from "./types.js";

export function MembersPanel({ adapter, orgId }: PanelProps) {
  const [members, setMembers] = useState<OrgMember[] | null>(null);
  const [invites, setInvites] = useState<Invitation[] | null>(null);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<OrgRole>("member");
  const [err, setErr] = useState<string | null>(null);

  const refresh = useCallback(() => {
    if (!orgId) return;
    setErr(null);
    Promise.all([
      adapter.members.list(orgId),
      adapter.invitations.list(orgId),
    ])
      .then(([m, i]) => {
        setMembers(m);
        setInvites(i);
      })
      .catch((e: unknown) => setErr(String((e as Error)?.message ?? e)));
  }, [adapter, orgId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  if (!orgId) {
    return (
      <section className="p-4">
        <h2 className="text-xl font-semibold mb-2">Members</h2>
        <p className="text-sm text-gray-500">Select a team first.</p>
      </section>
    );
  }

  const invite = async () => {
    if (!email) return;
    try {
      await adapter.invitations.create(orgId, { email, role });
      setEmail("");
      refresh();
    } catch (e) {
      setErr(String((e as Error)?.message ?? e));
    }
  };

  return (
    <section data-openportal-panel="members" className="p-4">
      <h2 className="text-xl font-semibold mb-4">Members</h2>

      {err ? <p className="text-sm text-red-600 mb-4">Error: {err}</p> : null}

      <div className="flex gap-2 mb-6">
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email to invite"
          className="border rounded px-2 py-1 flex-1"
        />
        <select
          value={role}
          onChange={(e) => setRole(e.target.value as OrgRole)}
          className="border rounded px-2 py-1"
        >
          <option value="owner">Owner</option>
          <option value="admin">Admin</option>
          <option value="member">Member</option>
          <option value="guest">Guest</option>
        </select>
        <button
          onClick={invite}
          className="border rounded px-3 py-1 bg-black text-white"
        >
          Invite
        </button>
      </div>

      <h3 className="text-sm font-medium text-gray-600 mb-2">Members</h3>
      {members === null ? (
        <p className="text-sm text-gray-500">Loading…</p>
      ) : members.length === 0 ? (
        <p className="text-sm text-gray-500">No members yet.</p>
      ) : (
        <ul className="space-y-1 mb-6">
          {members.map((m) => (
            <li key={m.id} className="flex items-center justify-between border rounded px-3 py-2">
              <span className="text-sm">{m.userId}</span>
              <span className="text-xs text-gray-500">{m.role}</span>
            </li>
          ))}
        </ul>
      )}

      <h3 className="text-sm font-medium text-gray-600 mb-2">Pending invitations</h3>
      {invites === null ? null : invites.length === 0 ? (
        <p className="text-sm text-gray-500">No pending invitations.</p>
      ) : (
        <ul className="space-y-1">
          {invites.map((i) => (
            <li key={i.id} className="flex items-center justify-between border rounded px-3 py-2">
              <span className="text-sm">{i.email}</span>
              <span className="text-xs text-gray-500">
                {i.role} · expires {i.expiresAt.toLocaleDateString?.() ?? String(i.expiresAt)}
              </span>
              <button
                onClick={async () => {
                  await adapter.invitations.revoke(orgId, i.id);
                  refresh();
                }}
                className="text-xs text-red-600 hover:underline"
              >
                Revoke
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
