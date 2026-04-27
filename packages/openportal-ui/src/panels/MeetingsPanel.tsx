"use client";

import { useCallback, useEffect, useState } from "react";
import type { Meeting } from "@opensoftware/openportal-core";
import type { PanelProps } from "./types.js";

export function MeetingsPanel({ adapter, orgId }: PanelProps) {
  const [meetings, setMeetings] = useState<Meeting[] | null>(null);
  const [title, setTitle] = useState("");
  const [err, setErr] = useState<string | null>(null);

  const refresh = useCallback(() => {
    if (!orgId) return;
    setErr(null);
    adapter.meetings
      .list(orgId)
      .then(setMeetings)
      .catch((e: unknown) => setErr(String((e as Error)?.message ?? e)));
  }, [adapter, orgId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  if (!orgId) {
    return (
      <section className="p-4">
        <h2 className="text-xl font-semibold mb-2">Meetings</h2>
        <p className="text-sm text-gray-500">Select a team first.</p>
      </section>
    );
  }

  const start = async () => {
    if (!title.trim()) return;
    await adapter.meetings.start(orgId, title.trim());
    setTitle("");
    refresh();
  };

  const stop = async (id: string) => {
    await adapter.meetings.stop(id);
    refresh();
  };

  return (
    <section data-openportal-panel="meetings" className="p-4">
      <h2 className="text-xl font-semibold mb-4">Meetings</h2>

      {err ? <p className="text-sm text-red-600 mb-4">Error: {err}</p> : null}

      <div className="flex gap-2 mb-4">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Meeting title"
          className="border rounded px-2 py-1 flex-1"
        />
        <button
          onClick={start}
          className="border rounded px-3 py-1 bg-black text-white"
        >
          Start
        </button>
      </div>

      {meetings === null ? (
        <p className="text-sm text-gray-500">Loading…</p>
      ) : meetings.length === 0 ? (
        <p className="text-sm text-gray-500">No meetings yet.</p>
      ) : (
        <ul className="space-y-1">
          {meetings.map((m) => (
            <li
              key={m.id}
              className="flex items-center justify-between border rounded px-3 py-2"
            >
              <div>
                <div className="font-medium">{m.title}</div>
                <div className="text-xs text-gray-500">
                  {new Date(m.startedAt).toLocaleString()}
                  {m.endedAt ? ` → ${new Date(m.endedAt).toLocaleString()}` : " · live"}
                </div>
              </div>
              {m.endedAt ? (
                m.recordingUrl ? (
                  <a
                    href={m.recordingUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-blue-600 hover:underline"
                  >
                    Recording
                  </a>
                ) : (
                  <span className="text-xs text-gray-400">No recording</span>
                )
              ) : (
                <button
                  onClick={() => stop(m.id)}
                  className="text-xs border rounded px-2 py-1"
                >
                  Stop
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
