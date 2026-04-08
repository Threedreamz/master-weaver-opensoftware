import { Hono } from "hono";
import { db } from "@opensoftware/openmailer-db";
import { segments, segmentContacts } from "@opensoftware/openmailer-db/schema";
import { eq, and, sql } from "drizzle-orm";

interface SegmentVariables {
  user: { id: string; email: string; name?: string; role?: string };
  workspaceId: string;
}

export const segmentRoutes = new Hono<{ Variables: SegmentVariables }>();

// GET /api/segments
segmentRoutes.get("/", async (c) => {
  const workspaceId = c.get("workspaceId");

  const rows = await db
    .select()
    .from(segments)
    .where(eq(segments.workspaceId, workspaceId));

  return c.json({ data: rows });
});

// GET /api/segments/:id
segmentRoutes.get("/:id", async (c) => {
  const workspaceId = c.get("workspaceId");
  const id = c.req.param("id")!;

  const [segment] = await db
    .select()
    .from(segments)
    .where(
      and(eq(segments.id, id), eq(segments.workspaceId, workspaceId)),
    )
    .limit(1);

  if (!segment) {
    return c.json({ error: "Segment not found" }, 404);
  }

  const [countResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(segmentContacts)
    .where(eq(segmentContacts.segmentId, id));

  return c.json({
    data: {
      ...segment,
      contactCount: Number(countResult.count),
    },
  });
});

// POST /api/segments
segmentRoutes.post("/", async (c) => {
  const workspaceId = c.get("workspaceId");
  const body = await c.req.json();

  const [segment] = await db
    .insert(segments)
    .values({
      ...body,
      workspaceId,
    })
    .returning();

  return c.json({ data: segment }, 201);
});

// PUT /api/segments/:id
segmentRoutes.put("/:id", async (c) => {
  const workspaceId = c.get("workspaceId");
  const id = c.req.param("id")!;
  const body = await c.req.json();

  const [segment] = await db
    .update(segments)
    .set({
      ...body,
      updatedAt: new Date(),
    })
    .where(
      and(eq(segments.id, id), eq(segments.workspaceId, workspaceId)),
    )
    .returning();

  if (!segment) {
    return c.json({ error: "Segment not found" }, 404);
  }

  return c.json({ data: segment });
});

// DELETE /api/segments/:id
segmentRoutes.delete("/:id", async (c) => {
  const workspaceId = c.get("workspaceId");
  const id = c.req.param("id")!;

  const [segment] = await db
    .delete(segments)
    .where(
      and(eq(segments.id, id), eq(segments.workspaceId, workspaceId)),
    )
    .returning();

  if (!segment) {
    return c.json({ error: "Segment not found" }, 404);
  }

  return c.json({ data: segment });
});
