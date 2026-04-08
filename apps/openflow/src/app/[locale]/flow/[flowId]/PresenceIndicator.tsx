"use client";

import { useState, useEffect, useRef, useCallback } from "react";

interface PresenceEntry {
  sessionId: string;
  userId?: string;
  userName: string;
  avatarUrl?: string;
  currentStepId?: string;
  color: string;
  lastSeen: number;
}

interface PresenceIndicatorProps {
  flowId: string;
  userName?: string;
  avatarUrl?: string;
  currentStepId?: string;
}

// Stable session ID per browser tab
function getOrCreateSessionId(): string {
  const key = "openflow-session-id";
  let id = sessionStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem(key, id);
  }
  return id;
}

function AvatarBubble({ entry, isMe }: { entry: PresenceEntry; isMe: boolean }) {
  const [tooltip, setTooltip] = useState(false);
  const initials = entry.userName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

  return (
    <div className="relative" onMouseEnter={() => setTooltip(true)} onMouseLeave={() => setTooltip(false)}>
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold border-2 border-white shadow-sm cursor-default ${isMe ? "ring-2 ring-offset-1" : ""}`}
        style={{ backgroundColor: entry.color, outlineColor: entry.color }}
      >
        {entry.avatarUrl ? (
          <img src={entry.avatarUrl} alt={entry.userName} className="w-full h-full rounded-full object-cover" />
        ) : (
          initials
        )}
      </div>
      {isMe && (
        <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-400 border border-white rounded-full" />
      )}
      {tooltip && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap shadow-lg z-50">
          {isMe ? "Du" : entry.userName}
          {entry.currentStepId && <div className="text-gray-400 text-[10px]">Bearbeitet gerade...</div>}
        </div>
      )}
    </div>
  );
}

export default function PresenceIndicator({ flowId, userName = "Ich", avatarUrl, currentStepId }: PresenceIndicatorProps) {
  const [presence, setPresence] = useState<PresenceEntry[]>([]);
  const sessionId = useRef<string>("");
  const myColor = useRef<string>("#4C5FD5");

  const sendHeartbeat = useCallback(async () => {
    try {
      const res = await fetch(`/api/flows/${flowId}/presence`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: sessionId.current,
          userName,
          avatarUrl,
          currentStepId,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        myColor.current = data.color;
      }
    } catch {
      // ignore network errors silently
    }
  }, [flowId, userName, avatarUrl, currentStepId]);

  const fetchPresence = useCallback(async () => {
    try {
      const res = await fetch(`/api/flows/${flowId}/presence`);
      if (res.ok) setPresence(await res.json());
    } catch {
      // ignore
    }
  }, [flowId]);

  useEffect(() => {
    sessionId.current = getOrCreateSessionId();

    // Initial heartbeat + poll presence
    sendHeartbeat();
    fetchPresence();

    const heartbeatInterval = setInterval(sendHeartbeat, 10_000);
    const pollInterval = setInterval(fetchPresence, 5_000);

    // Remove self on unmount
    return () => {
      clearInterval(heartbeatInterval);
      clearInterval(pollInterval);
      fetch(`/api/flows/${flowId}/presence`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: sessionId.current }),
      }).catch(() => {});
    };
  }, [flowId, sendHeartbeat, fetchPresence]);

  // Re-send heartbeat when stepId changes
  useEffect(() => {
    sendHeartbeat();
  }, [currentStepId, sendHeartbeat]);

  // Split: me vs others
  const others = presence.filter((p) => p.sessionId !== sessionId.current);
  const me = presence.find((p) => p.sessionId === sessionId.current) ?? {
    sessionId: sessionId.current,
    userName,
    avatarUrl,
    color: myColor.current,
    lastSeen: Date.now(),
  };

  if (others.length === 0) return null;

  return (
    <div className="flex items-center gap-1 mr-2" title="Aktive Nutzer">
      {/* Others first */}
      {others.slice(0, 3).map((entry) => (
        <AvatarBubble key={entry.sessionId} entry={entry} isMe={false} />
      ))}
      {others.length > 3 && (
        <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs text-gray-600 font-medium border-2 border-white shadow-sm">
          +{others.length - 3}
        </div>
      )}
      {/* Me */}
      <AvatarBubble entry={me} isMe />
    </div>
  );
}
