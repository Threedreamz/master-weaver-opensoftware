import { Hono } from "hono";
import { db } from "@opensoftware/openmailer-db";
import { emailWhitelist } from "@opensoftware/openmailer-db/schema";
import { eq, and } from "drizzle-orm";

interface WhitelistVariables {
  user: { id: string; email: string; name?: string; role?: string };
  workspaceId: string;
}

export const whitelistRoutes = new Hono<{ Variables: WhitelistVariables }>();

// GET /api/whitelist — list all entries for this workspace
whitelistRoutes.get("/", async (c) => {
  const workspaceId = c.get("workspaceId");

  const entries = await db
    .select()
    .from(emailWhitelist)
    .where(eq(emailWhitelist.workspaceId, workspaceId))
    .orderBy(emailWhitelist.createdAt);

  return c.json({ data: entries });
});

// POST /api/whitelist — add an email or domain
whitelistRoutes.post("/", async (c) => {
  const workspaceId = c.get("workspaceId");
  const body = await c.req.json() as {
    email?: string;
    domain?: string;
    source?: string;
    notes?: string;
  };

  if (!body.email && !body.domain) {
    return c.json({ error: "Either email or domain is required" }, 400);
  }

  const [entry] = await db
    .insert(emailWhitelist)
    .values({
      workspaceId,
      email: body.email ?? null,
      domain: body.domain ?? null,
      source: body.source ?? "manual",
      notes: body.notes ?? null,
    })
    .returning();

  return c.json({ data: entry }, 201);
});

// DELETE /api/whitelist/:id — remove an entry
whitelistRoutes.delete("/:id", async (c) => {
  const workspaceId = c.get("workspaceId");
  const id = c.req.param("id")!;

  const [deleted] = await db
    .delete(emailWhitelist)
    .where(
      and(
        eq(emailWhitelist.id, id),
        eq(emailWhitelist.workspaceId, workspaceId),
      ),
    )
    .returning();

  if (!deleted) {
    return c.json({ error: "Entry not found" }, 404);
  }

  return c.json({ success: true });
});
