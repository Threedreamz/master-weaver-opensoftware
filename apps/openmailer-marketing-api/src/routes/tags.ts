import { Hono } from "hono";
import { db } from "@opensoftware/openmailer-db";
import { tags } from "@opensoftware/openmailer-db/schema";
import { eq, and } from "drizzle-orm";

interface TagVariables {
  user: { id: string; email: string; name?: string; role?: string };
  workspaceId: string;
}

export const tagRoutes = new Hono<{ Variables: TagVariables }>();

// GET /api/tags
tagRoutes.get("/", async (c) => {
  const workspaceId = c.get("workspaceId");

  const rows = await db
    .select()
    .from(tags)
    .where(eq(tags.workspaceId, workspaceId));

  return c.json({ data: rows });
});

// POST /api/tags
tagRoutes.post("/", async (c) => {
  const workspaceId = c.get("workspaceId");
  const body = await c.req.json();

  const [tag] = await db
    .insert(tags)
    .values({
      ...body,
      workspaceId,
    })
    .returning();

  return c.json({ data: tag }, 201);
});

// PUT /api/tags/:id
tagRoutes.put("/:id", async (c) => {
  const workspaceId = c.get("workspaceId");
  const id = c.req.param("id")!;
  const body = await c.req.json();

  const [tag] = await db
    .update(tags)
    .set(body)
    .where(and(eq(tags.id, id), eq(tags.workspaceId, workspaceId)))
    .returning();

  if (!tag) {
    return c.json({ error: "Tag not found" }, 404);
  }

  return c.json({ data: tag });
});

// DELETE /api/tags/:id
tagRoutes.delete("/:id", async (c) => {
  const workspaceId = c.get("workspaceId");
  const id = c.req.param("id")!;

  const [tag] = await db
    .delete(tags)
    .where(and(eq(tags.id, id), eq(tags.workspaceId, workspaceId)))
    .returning();

  if (!tag) {
    return c.json({ error: "Tag not found" }, 404);
  }

  return c.json({ data: tag });
});
