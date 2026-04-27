"use client";

import { useState, useRef } from "react";
import { Pencil } from "lucide-react";

interface FlowNameEditorProps {
  flowId: string;
  initialName: string;
}

export function FlowNameEditor({ flowId, initialName }: FlowNameEditorProps) {
  const [name, setName] = useState(initialName);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(initialName);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function startEdit(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setDraft(name);
    setEditing(true);
    setTimeout(() => {
      inputRef.current?.select();
    }, 0);
  }

  async function commit() {
    const trimmed = draft.trim();
    if (!trimmed || trimmed === name) {
      setEditing(false);
      return;
    }
    setSaving(true);
    try {
      await fetch(`/api/flows/${flowId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });
      setName(trimmed);
    } finally {
      setSaving(false);
      setEditing(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") { e.preventDefault(); commit(); }
    if (e.key === "Escape") { setEditing(false); }
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={handleKeyDown}
        onClick={(e) => e.stopPropagation()}
        disabled={saving}
        className="w-full text-sm font-semibold text-gray-900 bg-white border border-indigo-400 rounded px-1 py-0.5 focus:outline-none focus:ring-2 focus:ring-indigo-300 disabled:opacity-60"
      />
    );
  }

  return (
    <button
      onClick={startEdit}
      className="group flex items-center gap-1 text-left w-full min-w-0"
      title="Titel bearbeiten"
    >
      <span className="font-semibold text-gray-900 text-sm truncate">{name}</span>
      <Pencil
        size={11}
        className="shrink-0 text-gray-300 group-hover:text-indigo-500 transition-colors"
      />
    </button>
  );
}
