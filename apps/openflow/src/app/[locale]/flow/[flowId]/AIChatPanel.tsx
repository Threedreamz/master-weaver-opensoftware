"use client";

import { useState, useRef, useEffect } from "react";
import { Sparkles, Send, Loader, ChevronDown, ChevronRight, Undo2, FileText } from "lucide-react";
import type { FlowDefinition } from "@opensoftware/openflow-core";
import type { FlowOperation } from "@/types/ai-edit";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  operations?: FlowOperation[];
  status?: "pending" | "applied" | "error";
  errorText?: string;
}

interface AIChatPanelProps {
  flow: FlowDefinition | null;
  flowId: string;
  onApplyOperations: (ops: FlowOperation[]) => Promise<void>;
  onUndo: () => void;
  onOpenPlanEdit?: () => void;
}

// ─── Operation label helper ───────────────────────────────────────────────────

function operationLabel(op: FlowOperation): string {
  switch (op.type) {
    case "add_step": return `Seite hinzufügen: "${op.label}"`;
    case "delete_step": return `Seite löschen (${op.stepId.slice(0, 8)})`;
    case "update_step": return `Seite aktualisieren (${op.stepId.slice(0, 8)})`;
    case "add_component": return `Feld hinzufügen: ${op.component.componentType} (${op.component.fieldKey})`;
    case "update_component": return `Feld aktualisieren (${op.componentId.slice(0, 8)})`;
    case "delete_component": return `Feld löschen (${op.componentId.slice(0, 8)})`;
    case "add_edge": return `Regel hinzufügen`;
    case "update_edge": return `Regel aktualisieren`;
    case "delete_edge": return `Regel löschen`;
    case "update_settings": return `Einstellungen aktualisieren`;
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function AIChatPanel({
  flow,
  flowId,
  onApplyOperations,
  onUndo,
  onOpenPlanEdit,
}: AIChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [expandedOps, setExpandedOps] = useState<Set<string>>(new Set());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend() {
    const trimmed = input.trim();
    if (!trimmed || isLoading || !flow) return;

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      text: trimmed,
    };
    const pendingMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "assistant",
      text: "",
      status: "pending",
    };

    setMessages((prev) => [...prev, userMsg, pendingMsg]);
    setInput("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/ai/edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          flowId,
          instruction: trimmed,
          flowSnapshot: flow,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setMessages((prev) =>
          prev.map((m) =>
            m.id === pendingMsg.id
              ? { ...m, status: "error", text: data.error ?? "Fehler beim KI-Aufruf." }
              : m
          )
        );
        return;
      }

      const data: { operations: FlowOperation[]; summary: string } = await res.json();

      // Apply operations
      try {
        await onApplyOperations(data.operations);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === pendingMsg.id
              ? { ...m, text: data.summary, operations: data.operations, status: "applied" }
              : m
          )
        );
      } catch (applyErr) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === pendingMsg.id
              ? {
                  ...m,
                  text: data.summary,
                  operations: data.operations,
                  status: "error",
                  errorText: applyErr instanceof Error ? applyErr.message : "Fehler beim Anwenden.",
                }
              : m
          )
        );
      }
    } catch {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === pendingMsg.id
            ? { ...m, status: "error", text: "Netzwerkfehler. Bitte erneut versuchen." }
            : m
        )
      );
    } finally {
      setIsLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function toggleOps(msgId: string) {
    setExpandedOps((prev) => {
      const next = new Set(prev);
      if (next.has(msgId)) next.delete(msgId);
      else next.add(msgId);
      return next;
    });
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
        <Sparkles size={14} className="text-indigo-500" />
        <span className="text-xs font-semibold text-gray-700">KI-Assistent</span>
        <div className="ml-auto flex items-center gap-3">
          {flow?.aiPlan && onOpenPlanEdit && (
            <button
              onClick={onOpenPlanEdit}
              className="flex items-center gap-1 text-xs text-gray-500 hover:text-indigo-600 transition-colors"
              title="Start-Prompt bearbeiten"
            >
              <FileText size={12} />
              <span>Start-Prompt</span>
            </button>
          )}
          {messages.some((m) => m.status === "applied") && (
            <button
              onClick={onUndo}
              className="flex items-center gap-1 text-xs text-gray-500 hover:text-indigo-600 transition-colors"
              title="Letzte Änderung rückgängig (Ctrl+Z)"
            >
              <Undo2 size={12} />
              <span>Rückgängig</span>
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3 min-h-0">
        {messages.length === 0 && (
          <div className="text-center py-8 space-y-2">
            <Sparkles size={24} className="text-indigo-300 mx-auto" />
            <p className="text-xs text-gray-400 leading-relaxed">
              Beschreibe Änderungen in natürlicher Sprache. Zum Beispiel:
            </p>
            <div className="space-y-1">
              {[
                "Füge auf Seite 2 ein Pflichtfeld für den Firmennamen hinzu",
                "Ändere den Titel der ersten Seite zu 'Willkommen'",
                "Erstelle eine Regel: wenn Kundentyp = Geschäftskunde, gehe zu Seite 5",
              ].map((ex) => (
                <button
                  key={ex}
                  onClick={() => setInput(ex)}
                  className="block w-full text-left text-xs text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 px-2 py-1 rounded transition-colors"
                >
                  „{ex}"
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] rounded-xl px-3 py-2 text-sm ${
                msg.role === "user"
                  ? "bg-indigo-600 text-white"
                  : msg.status === "error"
                    ? "bg-red-50 border border-red-200 text-red-700"
                    : "bg-gray-100 text-gray-800"
              }`}
            >
              {msg.status === "pending" ? (
                <div className="flex items-center gap-2 text-gray-500">
                  <Loader size={12} className="animate-spin" />
                  <span className="text-xs">KI denkt nach…</span>
                </div>
              ) : (
                <>
                  <p className="leading-relaxed">{msg.text}</p>
                  {msg.errorText && (
                    <p className="text-xs mt-1 opacity-80">{msg.errorText}</p>
                  )}
                  {msg.operations && msg.operations.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-gray-200">
                      <button
                        onClick={() => toggleOps(msg.id)}
                        className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700"
                      >
                        {expandedOps.has(msg.id) ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
                        {msg.operations.length} Operation{msg.operations.length !== 1 ? "en" : ""}
                        {msg.status === "applied" && (
                          <span className="ml-1 text-green-600">✓ angewendet</span>
                        )}
                      </button>
                      {expandedOps.has(msg.id) && (
                        <ul className="mt-1 space-y-0.5">
                          {msg.operations.map((op, i) => (
                            <li key={i} className="text-xs text-gray-500 flex items-start gap-1">
                              <span className="shrink-0 text-gray-400">·</span>
                              {operationLabel(op)}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="px-3 py-3 border-t border-gray-100">
        {!flow && (
          <p className="text-xs text-gray-400 text-center mb-2">Flow wird geladen…</p>
        )}
        <div className="flex gap-2 items-end">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Änderung beschreiben… (Enter zum Senden)"
            disabled={isLoading || !flow}
            rows={2}
            className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-400 disabled:opacity-50 disabled:bg-gray-50"
          />
          <button
            onClick={handleSend}
            disabled={isLoading || !input.trim() || !flow}
            className="shrink-0 w-8 h-8 flex items-center justify-center bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors mb-0.5"
            title="Senden (Enter)"
          >
            {isLoading ? <Loader size={14} className="animate-spin" /> : <Send size={14} />}
          </button>
        </div>
      </div>
    </div>
  );
}
