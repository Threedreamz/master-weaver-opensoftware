import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { pipMitglieder } from "@opensoftware/db/openpipeline";
import { getPipelineRolle } from "./permissions";

/**
 * Get the current user ID.
 * Reads from middleware-injected x-user-id header (set from JWT),
 * falls back to manual header for dev/testing.
 */
export async function getCurrentUserId(): Promise<string | null> {
  const h = await headers();
  // Middleware sets x-user-id from JWT token
  const userId = h.get("x-user-id");
  return userId || null;
}

/**
 * Require pipeline access — returns userId + rolle + vertrauensLevel.
 * Throws Response with 401 (not authenticated) or 403 (no access).
 */
export async function requirePipelineAccess(pipelineId: string): Promise<{
  userId: string;
  rolle: "vorgesetzter" | "zuarbeiter";
  vertrauensLevel: number;
  zugewieseneStufen: string[] | null;
}> {
  const userId = await getCurrentUserId();
  if (!userId) {
    throw new Response(JSON.stringify({ error: "Nicht authentifiziert" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const mitglieder = await db
    .select()
    .from(pipMitglieder)
    .where(eq(pipMitglieder.pipelineId, pipelineId));

  const rolle = getPipelineRolle(userId, mitglieder);

  // If no members exist yet, first user acts as vorgesetzter
  if (mitglieder.length === 0) {
    return { userId, rolle: "vorgesetzter", vertrauensLevel: 3, zugewieseneStufen: null };
  }

  if (!rolle) {
    throw new Response(JSON.stringify({ error: "Kein Zugriff auf diese Pipeline" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  const mitglied = mitglieder.find((m) => m.userId === userId)!;
  return {
    userId,
    rolle,
    vertrauensLevel: mitglied.vertrauensLevel,
    zugewieseneStufen: mitglied.zugewieseneStufen,
  };
}

/**
 * Require Vorgesetzter role — shortcut for admin-only routes.
 */
export async function requireVorgesetzter(pipelineId: string): Promise<{ userId: string }> {
  const access = await requirePipelineAccess(pipelineId);
  if (access.rolle !== "vorgesetzter") {
    throw new Response(JSON.stringify({ error: "Nur Vorgesetzte duerfen diese Aktion ausfuehren" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }
  return { userId: access.userId };
}
