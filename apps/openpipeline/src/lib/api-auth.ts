import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { pipMitglieder } from "@opensoftware/db/openpipeline";
import { getPipelineRolle } from "./permissions";

/**
 * Get the current user ID.
 * Dev mode: reads X-User-Id header or ?userId query param.
 * Prod: will read from NextAuth session (not yet wired).
 */
export async function getCurrentUserId(): Promise<string | null> {
  const h = await headers();
  const userId = h.get("x-user-id");
  if (userId) return userId;
  // TODO: NextAuth session integration
  // const session = await auth();
  // return session?.user?.id ?? null;
  return null;
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

  // If no members exist yet, first user with X-User-Id acts as vorgesetzter (dev mode)
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
    throw new Response(JSON.stringify({ error: "Nur Vorgesetzte dürfen diese Aktion ausführen" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }
  return { userId: access.userId };
}
