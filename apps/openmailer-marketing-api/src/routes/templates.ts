import { Hono } from "hono";
import { db } from "@opensoftware/openmailer-db";
import { emailTemplates } from "@opensoftware/openmailer-db/schema";
import { eq, and } from "drizzle-orm";

interface TemplateVariables {
  user: { id: string; email: string; name?: string; role?: string };
  workspaceId: string;
}

export const templateRoutes = new Hono<{ Variables: TemplateVariables }>();

// GET /api/templates
templateRoutes.get("/", async (c) => {
  const workspaceId = c.get("workspaceId");

  const rows = await db
    .select()
    .from(emailTemplates)
    .where(eq(emailTemplates.workspaceId, workspaceId));

  return c.json({ data: rows });
});

// GET /api/templates/:id
templateRoutes.get("/:id", async (c) => {
  const workspaceId = c.get("workspaceId");
  const id = c.req.param("id")!;

  const [template] = await db
    .select()
    .from(emailTemplates)
    .where(
      and(
        eq(emailTemplates.id, id),
        eq(emailTemplates.workspaceId, workspaceId),
      ),
    )
    .limit(1);

  if (!template) {
    return c.json({ error: "Template not found" }, 404);
  }

  return c.json({ data: template });
});

// POST /api/templates
templateRoutes.post("/", async (c) => {
  const workspaceId = c.get("workspaceId");
  const body = await c.req.json();

  const [template] = await db
    .insert(emailTemplates)
    .values({
      ...body,
      workspaceId,
    })
    .returning();

  return c.json({ data: template }, 201);
});

// PUT /api/templates/:id
templateRoutes.put("/:id", async (c) => {
  const workspaceId = c.get("workspaceId");
  const id = c.req.param("id")!;
  const body = await c.req.json();

  const [template] = await db
    .update(emailTemplates)
    .set({
      ...body,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(emailTemplates.id, id),
        eq(emailTemplates.workspaceId, workspaceId),
      ),
    )
    .returning();

  if (!template) {
    return c.json({ error: "Template not found" }, 404);
  }

  return c.json({ data: template });
});

// DELETE /api/templates/:id
templateRoutes.delete("/:id", async (c) => {
  const workspaceId = c.get("workspaceId");
  const id = c.req.param("id")!;

  const [template] = await db
    .delete(emailTemplates)
    .where(
      and(
        eq(emailTemplates.id, id),
        eq(emailTemplates.workspaceId, workspaceId),
      ),
    )
    .returning();

  if (!template) {
    return c.json({ error: "Template not found" }, 404);
  }

  return c.json({ data: template });
});
