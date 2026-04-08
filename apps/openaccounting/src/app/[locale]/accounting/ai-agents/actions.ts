"use server";

import { db, schema } from "@/db";
import { eq, desc } from "drizzle-orm";

type AcctAgentConversation = typeof schema.acctAgentConversations.$inferSelect;

export async function getConversations(
  agentTyp?: "steuerberater" | "steueringenieur"
): Promise<AcctAgentConversation[]> {
  try {

    if (agentTyp) {
      return await db
        .select()
        .from(schema.acctAgentConversations)
        .where(eq(schema.acctAgentConversations.agentTyp, agentTyp))
        .orderBy(desc(schema.acctAgentConversations.updatedAt));
    }

    return await db
      .select()
      .from(schema.acctAgentConversations)
      .orderBy(desc(schema.acctAgentConversations.updatedAt));
  } catch {
    return [];
  }
}

export async function createConversation(data: {
  agentTyp: "steuerberater" | "steueringenieur";
  titel?: string;
  userId?: string;
}): Promise<{ success: boolean; id?: number; error?: string }> {
  try {
    const result = await db.insert(schema.acctAgentConversations).values({
      agentTyp: data.agentTyp,
      titel: data.titel ?? `New ${data.agentTyp === "steuerberater" ? "Tax Advisor" : "Tax Engineer"} Chat`,
      userId: data.userId ?? null,
      messages: [],
      context: null,
      status: "aktiv",
    }).returning({ id: schema.acctAgentConversations.id });

    return { success: true, id: result[0]?.id };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export async function getConversation(
  id: number
): Promise<AcctAgentConversation | null> {
  try {
    const rows = await db
      .select()
      .from(schema.acctAgentConversations)
      .where(eq(schema.acctAgentConversations.id, id))
      .limit(1);

    return rows[0] ?? null;
  } catch {
    return null;
  }
}

export async function addMessage(
  conversationId: number,
  role: "user" | "assistant",
  content: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const rows = await db
      .select()
      .from(schema.acctAgentConversations)
      .where(eq(schema.acctAgentConversations.id, conversationId))
      .limit(1);

    if (rows.length === 0) {
      return { success: false, error: "Conversation not found" };
    }

    const conversation = rows[0];
    const messages = (conversation.messages ?? []) as Array<{
      role: string;
      content: string;
      timestamp: string;
    }>;

    messages.push({
      role,
      content,
      timestamp: new Date().toISOString(),
    });

    // If user message, generate a placeholder assistant response
    if (role === "user") {
      const agentName =
        conversation.agentTyp === "steuerberater"
          ? "Steuerberater"
          : "Steueringenieur";

      messages.push({
        role: "assistant",
        content: `[${agentName} AI] Danke fuer Ihre Frage. Dies ist eine Platzhalter-Antwort. In der Produktionsversion wuerde hier eine KI-gestuetzte Antwort generiert werden, die auf Ihrem Kontext und den aktuellen Steuerdaten basiert.`,
        timestamp: new Date().toISOString(),
      });
    }

    await db
      .update(schema.acctAgentConversations)
      .set({
        messages,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(schema.acctAgentConversations.id, conversationId));

    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
