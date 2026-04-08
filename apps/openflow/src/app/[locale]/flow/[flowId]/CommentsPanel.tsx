"use client";

import { useState, useEffect, useCallback } from "react";
import { MessageSquare, Check, RotateCcw, Trash2, Send, X } from "lucide-react";

interface Comment {
  id: string;
  flowId: string;
  stepId?: string | null;
  componentId?: string | null;
  authorName: string;
  authorAvatar?: string | null;
  content: string;
  resolved: boolean;
  createdAt: number;
}

interface CommentsPanelProps {
  flowId: string;
  onClose: () => void;
  selectedStepId?: string | null;
  selectedComponentId?: string | null;
}

function timeAgo(ts: number): string {
  const diff = Date.now() - ts * 1000;
  if (diff < 60_000) return "gerade eben";
  if (diff < 3_600_000) return `vor ${Math.round(diff / 60_000)} Min.`;
  if (diff < 86_400_000) return `vor ${Math.round(diff / 3_600_000)} Std.`;
  return `vor ${Math.round(diff / 86_400_000)} Tagen`;
}

function Avatar({ name, avatarUrl, size = 28 }: { name: string; avatarUrl?: string | null; size?: number }) {
  const initials = name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  if (avatarUrl) {
    return <img src={avatarUrl} alt={name} className="rounded-full object-cover" style={{ width: size, height: size }} />;
  }
  return (
    <div className="rounded-full flex items-center justify-center text-white font-bold text-xs shrink-0 bg-indigo-500" style={{ width: size, height: size, fontSize: size * 0.38 }}>
      {initials}
    </div>
  );
}

export default function CommentsPanel({ flowId, onClose, selectedStepId, selectedComponentId }: CommentsPanelProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState("");
  const [posting, setPosting] = useState(false);
  const [showResolved, setShowResolved] = useState(false);
  const [filter, setFilter] = useState<"all" | "step" | "flow">("all");

  const fetchComments = useCallback(async () => {
    try {
      const res = await fetch(`/api/flows/${flowId}/comments`);
      if (res.ok) setComments(await res.json());
    } finally {
      setLoading(false);
    }
  }, [flowId]);

  useEffect(() => {
    fetchComments();
    const interval = setInterval(fetchComments, 10_000);
    return () => clearInterval(interval);
  }, [fetchComments]);

  async function postComment() {
    if (!newComment.trim()) return;
    setPosting(true);
    try {
      const res = await fetch(`/api/flows/${flowId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: newComment.trim(),
          stepId: selectedStepId ?? undefined,
          componentId: selectedComponentId ?? undefined,
          authorName: "Du", // TODO: use actual user session name
        }),
      });
      if (res.ok) {
        const c = await res.json();
        setComments((prev) => [c, ...prev]);
        setNewComment("");
      }
    } finally {
      setPosting(false);
    }
  }

  async function toggleResolve(comment: Comment) {
    const action = comment.resolved ? "reopen" : "resolve";
    const res = await fetch(`/api/flows/${flowId}/comments/${comment.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, resolvedBy: "user" }),
    });
    if (res.ok) {
      const updated = await res.json();
      setComments((prev) => prev.map((c) => (c.id === comment.id ? updated : c)));
    }
  }

  async function deleteComment(id: string) {
    const res = await fetch(`/api/flows/${flowId}/comments/${id}`, { method: "DELETE" });
    if (res.ok) setComments((prev) => prev.filter((c) => c.id !== id));
  }

  const filtered = comments
    .filter((c) => showResolved ? true : !c.resolved)
    .filter((c) => {
      if (filter === "step" && selectedStepId) return c.stepId === selectedStepId;
      if (filter === "flow") return !c.stepId;
      return true;
    });

  const openCount = comments.filter((c) => !c.resolved).length;

  return (
    <div className="fixed right-4 top-16 bottom-4 w-80 bg-white rounded-xl shadow-2xl border border-gray-200 flex flex-col z-40">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 shrink-0">
        <div className="flex items-center gap-2">
          <MessageSquare size={16} className="text-indigo-600" />
          <span className="text-sm font-semibold text-gray-900">Kommentare</span>
          {openCount > 0 && (
            <span className="px-1.5 py-0.5 rounded-full bg-indigo-600 text-white text-[10px] font-bold">{openCount}</span>
          )}
        </div>
        <button onClick={onClose} className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600">
          <X size={16} />
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-1 px-3 py-2 border-b border-gray-100 shrink-0">
        {(["all", "flow", "step"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${filter === f ? "bg-indigo-50 text-indigo-600" : "text-gray-500 hover:text-gray-700"}`}
          >
            {f === "all" ? "Alle" : f === "flow" ? "Flow" : "Seite"}
          </button>
        ))}
        <label className="ml-auto flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer">
          <input
            type="checkbox"
            checked={showResolved}
            onChange={(e) => setShowResolved(e.target.checked)}
            className="rounded"
          />
          Erledigte
        </label>
      </div>

      {/* Comment list */}
      <div className="flex-1 overflow-y-auto divide-y divide-gray-50 min-h-0">
        {loading ? (
          <div className="p-4 text-center text-xs text-gray-400">Laden...</div>
        ) : filtered.length === 0 ? (
          <div className="p-6 text-center">
            <MessageSquare size={24} className="text-gray-300 mx-auto mb-2" />
            <p className="text-xs text-gray-400">Keine Kommentare{filter !== "all" ? " in diesem Bereich" : ""}.</p>
          </div>
        ) : (
          filtered.map((comment) => (
            <div key={comment.id} className={`p-3 group ${comment.resolved ? "opacity-50" : ""}`}>
              <div className="flex items-start gap-2">
                <Avatar name={comment.authorName} avatarUrl={comment.authorAvatar} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="text-xs font-semibold text-gray-800 truncate">{comment.authorName}</span>
                    <span className="text-[10px] text-gray-400 shrink-0">{timeAgo(comment.createdAt)}</span>
                  </div>
                  {(comment.stepId || comment.componentId) && (
                    <div className="text-[10px] text-indigo-500 mb-1">
                      {comment.componentId ? "Element-Kommentar" : "Seiten-Kommentar"}
                    </div>
                  )}
                  <p className="text-xs text-gray-700 leading-relaxed">{comment.content}</p>
                </div>
              </div>
              {/* Actions */}
              <div className="flex items-center gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity ml-9">
                <button
                  onClick={() => toggleResolve(comment)}
                  className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium border transition-colors ${
                    comment.resolved
                      ? "border-gray-200 text-gray-500 hover:bg-gray-50"
                      : "border-green-200 text-green-700 hover:bg-green-50"
                  }`}
                >
                  {comment.resolved ? <RotateCcw size={10} /> : <Check size={10} />}
                  {comment.resolved ? "Wieder öffnen" : "Erledigt"}
                </button>
                <button
                  onClick={() => deleteComment(comment.id)}
                  className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium border border-red-100 text-red-500 hover:bg-red-50 transition-colors"
                >
                  <Trash2 size={10} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* New comment input */}
      <div className="border-t border-gray-100 p-3 shrink-0">
        {(selectedStepId || selectedComponentId) && (
          <div className="text-[10px] text-indigo-500 mb-1.5">
            Kommentar zu: {selectedComponentId ? "ausgewähltem Element" : "ausgewählter Seite"}
          </div>
        )}
        <div className="flex gap-2">
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) postComment();
            }}
            placeholder="Kommentar schreiben... (⌘+Enter)"
            rows={2}
            className="flex-1 text-xs border border-gray-200 rounded-lg px-2 py-1.5 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
          <button
            onClick={postComment}
            disabled={posting || !newComment.trim()}
            className="self-end p-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-40 transition-colors"
          >
            <Send size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
