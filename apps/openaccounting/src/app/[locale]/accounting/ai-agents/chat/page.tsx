"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { PageHeader } from "@opensoftware/ui";
import { Send, Loader2, Scale, Cpu, User, ArrowLeft } from "lucide-react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { getConversation, addMessage } from "../actions";

interface ChatMessage {
  role: string;
  content: string;
  timestamp: string;
}

export default function ChatPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const locale = params.locale as string;
  const conversationId = Number(searchParams.get("id"));

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [agentTyp, setAgentTyp] = useState<string>("steuerberater");
  const [titel, setTitel] = useState<string>("");
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  const loadConversation = useCallback(async () => {
    if (!conversationId) return;
    setLoading(true);
    const conv = await getConversation(conversationId);
    if (conv) {
      setMessages((conv.messages as ChatMessage[]) ?? []);
      setAgentTyp(conv.agentTyp);
      setTitel(conv.titel ?? "");
    }
    setLoading(false);
  }, [conversationId]);

  useEffect(() => {
    loadConversation();
  }, [loadConversation]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const handleSend = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed || sending || !conversationId) return;

    setInput("");
    setSending(true);

    // Optimistically add user message
    const userMsg: ChatMessage = {
      role: "user",
      content: trimmed,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);

    const result = await addMessage(conversationId, "user", trimmed);

    if (result.success) {
      // Reload to get the assistant response
      const conv = await getConversation(conversationId);
      if (conv) {
        setMessages((conv.messages as ChatMessage[]) ?? []);
      }
    }

    setSending(false);
  }, [input, sending, conversationId]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  if (!conversationId) {
    return (
      <div className="p-6 text-center text-gray-500">
        No conversation selected.{" "}
        <button
          onClick={() => router.push(`/${locale}/accounting/ai-agents`)}
          className="text-emerald-600 hover:underline"
        >
          Go back
        </button>
      </div>
    );
  }

  const AgentIcon =
    agentTyp === "steuerberater" ? Scale : Cpu;
  const agentColor =
    agentTyp === "steuerberater" ? "emerald" : "indigo";
  const agentLabel =
    agentTyp === "steuerberater" ? "Steuerberater" : "Steueringenieur";

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-200 dark:border-gray-800">
        <button
          onClick={() => router.push(`/${locale}/accounting/ai-agents`)}
          className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
          aria-label="Back to agents"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div
          className={`w-8 h-8 rounded-full flex items-center justify-center bg-${agentColor}-100 dark:bg-${agentColor}-900/30`}
        >
          <AgentIcon className={`w-4 h-4 text-${agentColor}-600`} />
        </div>
        <div>
          <h2 className="font-semibold text-gray-900 dark:text-white text-sm">
            {titel || agentLabel}
          </h2>
          <p className="text-xs text-gray-500">{agentLabel} AI</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading conversation...</div>
        ) : messages.length === 0 ? (
          <div className="text-center py-16">
            <AgentIcon className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p className="text-gray-500">
              Start the conversation by typing a message below.
            </p>
          </div>
        ) : (
          messages.map((msg, i) => (
            <div
              key={i}
              className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              {msg.role !== "user" && (
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 bg-${agentColor}-100 dark:bg-${agentColor}-900/30`}
                >
                  <AgentIcon className={`w-4 h-4 text-${agentColor}-600`} />
                </div>
              )}
              <div
                className={`max-w-[75%] rounded-xl px-4 py-3 ${
                  msg.role === "user"
                    ? "bg-emerald-600 text-white"
                    : "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white"
                }`}
              >
                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                <p
                  className={`text-xs mt-1 ${
                    msg.role === "user"
                      ? "text-emerald-200"
                      : "text-gray-400"
                  }`}
                >
                  {new Date(msg.timestamp).toLocaleTimeString("de-DE", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
              {msg.role === "user" && (
                <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 bg-gray-200 dark:bg-gray-700">
                  <User className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                </div>
              )}
            </div>
          ))
        )}
        {sending && (
          <div className="flex gap-3 justify-start">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 bg-${agentColor}-100 dark:bg-${agentColor}-900/30`}
            >
              <Loader2 className={`w-4 h-4 text-${agentColor}-600 animate-spin`} />
            </div>
            <div className="bg-gray-100 dark:bg-gray-800 rounded-xl px-4 py-3">
              <p className="text-sm text-gray-500">Typing...</p>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-800">
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`Ask the ${agentLabel}...`}
              rows={1}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm resize-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              disabled={sending}
            />
          </div>
          <button
            onClick={handleSend}
            disabled={!input.trim() || sending}
            className="px-4 py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            aria-label="Send message"
          >
            {sending ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
