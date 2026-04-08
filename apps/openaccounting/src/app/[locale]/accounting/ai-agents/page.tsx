"use client";

import { useState, useEffect, useCallback } from "react";
import { PageHeader, StatusBadge } from "@opensoftware/ui";
import { Bot, MessageSquare, Scale, Cpu, ArrowRight } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { getConversations, createConversation } from "./actions";

type AcctAgentConversation = Awaited<ReturnType<typeof getConversations>>[number];

interface AgentCard {
  type: "steuerberater" | "steueringenieur";
  label: string;
  description: string;
  icon: React.ReactNode;
}

const AGENTS: AgentCard[] = [
  {
    type: "steuerberater",
    label: "Steuerberater (Tax Advisor)",
    description:
      "Ask questions about tax obligations, deductions, filing deadlines, and general accounting compliance. Get guidance on VAT returns, income tax, and financial planning.",
    icon: <Scale className="w-8 h-8 text-emerald-600" />,
  },
  {
    type: "steueringenieur",
    label: "Steueringenieur (Tax Engineer)",
    description:
      "Technical tax optimization, complex depreciation strategies, transfer pricing, R&D tax credits, and advanced structuring. For businesses with engineering or manufacturing focus.",
    icon: <Cpu className="w-8 h-8 text-indigo-600" />,
  },
];

export default function AIAgentsPage() {
  const params = useParams();
  const router = useRouter();
  const locale = params.locale as string;

  const [conversations, setConversations] = useState<AcctAgentConversation[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    const data = await getConversations();
    setConversations(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleStartConversation = useCallback(
    async (agentTyp: "steuerberater" | "steueringenieur") => {
      const result = await createConversation({ agentTyp });
      if (result.success && result.id) {
        router.push(`/${locale}/accounting/ai-agents/chat?id=${result.id}`);
      }
    },
    [locale, router]
  );

  const getConversationCount = (agentTyp: string) =>
    conversations.filter((c) => c.agentTyp === agentTyp).length;

  const recentConversations = conversations.slice(0, 10);

  return (
    <>
      <PageHeader
        title="KI-Berater"
        description="AI-powered tax and accounting advisors"
      />

      {/* Agent Cards */}
      <div className="px-6 grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {AGENTS.map((agent) => (
          <div
            key={agent.type}
            className="p-6 bg-white dark:bg-gray-950 rounded-xl border border-gray-200 dark:border-gray-800 flex flex-col"
          >
            <div className="flex items-start gap-4 mb-4">
              <div className="w-14 h-14 rounded-lg bg-gray-50 dark:bg-gray-900 flex items-center justify-center flex-shrink-0">
                {agent.icon}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                  {agent.label}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                  {agent.description}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between mt-auto pt-4 border-t border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-1.5 text-sm text-gray-500">
                <MessageSquare className="w-4 h-4" />
                <span>{getConversationCount(agent.type)} conversations</span>
              </div>
              <button
                onClick={() => handleStartConversation(agent.type)}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm hover:bg-emerald-700 flex items-center gap-2"
              >
                Start Conversation
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Conversations */}
      <div className="px-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Recent Conversations
        </h2>

        {loading ? (
          <div className="text-center py-8 text-gray-500">Loading conversations...</div>
        ) : recentConversations.length === 0 ? (
          <div className="text-center py-12">
            <Bot className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">
              No conversations yet
            </h3>
            <p className="text-gray-500 dark:text-gray-400">
              Start a conversation with one of the AI agents above.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {recentConversations.map((conv) => (
              <button
                key={conv.id}
                onClick={() =>
                  router.push(`/${locale}/accounting/ai-agents/chat?id=${conv.id}`)
                }
                className="w-full flex items-center justify-between p-4 bg-white dark:bg-gray-950 rounded-lg border border-gray-200 dark:border-gray-800 hover:border-emerald-300 dark:hover:border-emerald-700 transition-colors text-left"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                      conv.agentTyp === "steuerberater"
                        ? "bg-emerald-100 dark:bg-emerald-900/30"
                        : "bg-indigo-100 dark:bg-indigo-900/30"
                    }`}
                  >
                    {conv.agentTyp === "steuerberater" ? (
                      <Scale className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <Cpu className="w-4 h-4 text-indigo-600" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {conv.titel ?? "Untitled"}
                    </p>
                    <p className="text-xs text-gray-500">
                      {(conv.messages as unknown[])?.length ?? 0} messages
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <StatusBadge status={conv.status ?? "aktiv"} />
                  <span className="text-xs text-gray-400">
                    {conv.updatedAt
                      ? new Date(conv.updatedAt).toLocaleDateString("de-DE")
                      : "-"}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
