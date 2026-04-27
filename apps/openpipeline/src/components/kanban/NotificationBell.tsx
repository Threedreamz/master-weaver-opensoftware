"use client";

import { useEffect, useState } from "react";
import { Bell, Check, X } from "lucide-react";
import type { Benachrichtigung } from "@opensoftware/db/openpipeline";

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Benachrichtigung[]>([]);
  const [ungelesen, setUngelesen] = useState(0);

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  async function loadNotifications() {
    const res = await fetch("/api/benachrichtigungen?limit=20");
    if (res.ok) {
      const data = await res.json();
      setNotifications(data.benachrichtigungen);
      setUngelesen(data.ungelesen);
    }
  }

  async function markGelesen(id: string) {
    await fetch(`/api/benachrichtigungen/${id}/gelesen`, { method: "PATCH" });
    setNotifications(notifications.map((n) => n.id === id ? { ...n, gelesen: true } : n));
    setUngelesen(Math.max(0, ungelesen - 1));
  }

  async function alleGelesen() {
    await fetch("/api/benachrichtigungen/alle-gelesen", { method: "POST" });
    setNotifications(notifications.map((n) => ({ ...n, gelesen: true })));
    setUngelesen(0);
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200"
      >
        <Bell className="w-5 h-5" />
        {ungelesen > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-red-500 text-[10px] text-white flex items-center justify-center font-medium">
            {ungelesen > 9 ? "9+" : ungelesen}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 z-50 w-80 bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-800">
              <span className="text-sm font-medium text-zinc-200">Benachrichtigungen</span>
              {ungelesen > 0 && (
                <button onClick={alleGelesen} className="text-[10px] text-blue-400 hover:text-blue-300">
                  Alle gelesen
                </button>
              )}
            </div>

            <div className="max-h-80 overflow-y-auto">
              {notifications.length === 0 && (
                <p className="text-sm text-zinc-500 text-center py-6">Keine Benachrichtigungen</p>
              )}
              {notifications.map((n) => (
                <div
                  key={n.id}
                  className={`flex items-start gap-2 px-3 py-2 border-b border-zinc-800/50 hover:bg-zinc-800/50 cursor-pointer ${
                    !n.gelesen ? "bg-zinc-800/30" : ""
                  }`}
                  onClick={() => {
                    if (!n.gelesen) markGelesen(n.id);
                    if (n.link) window.location.href = n.link;
                  }}
                >
                  {!n.gelesen && <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-zinc-200">{n.titel}</p>
                    {n.nachricht && <p className="text-[10px] text-zinc-500 truncate">{n.nachricht}</p>}
                    <p className="text-[10px] text-zinc-600 mt-0.5">{new Date(n.createdAt).toLocaleString("de-DE")}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
