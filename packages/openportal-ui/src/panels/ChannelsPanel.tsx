"use client";

import { useCallback, useEffect, useState } from "react";
import type { Channel, Message } from "@opensoftware/openportal-core";
import type { PanelProps } from "./types.js";

export function ChannelsPanel({ adapter, orgId }: PanelProps) {
  const [channels, setChannels] = useState<Channel[] | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[] | null>(null);
  const [draft, setDraft] = useState("");
  const [newChannelName, setNewChannelName] = useState("");
  const [err, setErr] = useState<string | null>(null);

  const refresh = useCallback(() => {
    if (!orgId) return;
    setErr(null);
    adapter.channels
      .list(orgId)
      .then((cs) => {
        setChannels(cs);
        if (selected === null && cs[0]) setSelected(cs[0].id);
      })
      .catch((e: unknown) => setErr(String((e as Error)?.message ?? e)));
  }, [adapter, orgId, selected]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!selected) return;
    adapter.messages
      .list(selected, { limit: 50 })
      .then(setMessages)
      .catch((e: unknown) => setErr(String((e as Error)?.message ?? e)));
  }, [adapter, selected]);

  if (!orgId) {
    return (
      <section className="p-4">
        <h2 className="text-xl font-semibold mb-2">Channels</h2>
        <p className="text-sm text-gray-500">Select a team first.</p>
      </section>
    );
  }

  const post = async () => {
    if (!selected || !draft.trim()) return;
    const m = await adapter.messages.post(selected, draft.trim());
    setMessages((xs) => (xs ? [...xs, m] : [m]));
    setDraft("");
  };

  const addChannel = async () => {
    if (!newChannelName.trim()) return;
    await adapter.channels.create(orgId, {
      name: newChannelName.trim(),
      kind: "public",
    });
    setNewChannelName("");
    refresh();
  };

  return (
    <section data-openportal-panel="channels" className="p-4 grid grid-cols-[240px_1fr] gap-4">
      <aside>
        <h2 className="text-sm font-semibold mb-3">Channels</h2>
        {err ? <p className="text-xs text-red-600 mb-2">Error: {err}</p> : null}
        <ul className="space-y-1">
          {(channels ?? []).map((c) => (
            <li key={c.id}>
              <button
                onClick={() => setSelected(c.id)}
                className={`w-full text-left px-2 py-1 rounded ${
                  selected === c.id ? "bg-black text-white" : "hover:bg-gray-100"
                }`}
              >
                # {c.name}
              </button>
            </li>
          ))}
        </ul>
        <div className="mt-4 flex gap-1">
          <input
            value={newChannelName}
            onChange={(e) => setNewChannelName(e.target.value)}
            placeholder="new-channel"
            className="border rounded px-2 py-1 text-sm flex-1"
          />
          <button onClick={addChannel} className="border rounded px-2 py-1 text-sm">
            +
          </button>
        </div>
      </aside>

      <main>
        {!selected ? (
          <p className="text-sm text-gray-500">Select or create a channel.</p>
        ) : (
          <>
            <div className="border rounded min-h-[300px] p-3 mb-3 space-y-2">
              {messages === null ? (
                <p className="text-sm text-gray-500">Loading…</p>
              ) : messages.length === 0 ? (
                <p className="text-sm text-gray-500">No messages yet.</p>
              ) : (
                messages.map((m) => (
                  <div key={m.id} className="text-sm">
                    <div className="text-xs text-gray-500">
                      {m.authorId} · {new Date(m.createdAt).toLocaleString()}
                    </div>
                    <div>{m.body}</div>
                  </div>
                ))
              )}
            </div>
            <div className="flex gap-2">
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    post();
                  }
                }}
                placeholder="Message"
                className="border rounded px-3 py-2 flex-1"
              />
              <button
                onClick={post}
                className="border rounded px-3 py-2 bg-black text-white"
              >
                Send
              </button>
            </div>
          </>
        )}
      </main>
    </section>
  );
}
