import { Hono } from "hono";
import { db } from "@opensoftware/openmailer-db";
import { automations, automationSteps } from "@opensoftware/openmailer-db/schema";
import { eq, and } from "drizzle-orm";

interface AutomationVariables {
  user: { id: string; email: string; name?: string; role?: string };
  workspaceId: string;
}

export const automationRoutes = new Hono<{
  Variables: AutomationVariables;
}>();

// GET /api/automations
automationRoutes.get("/", async (c) => {
  const workspaceId = c.get("workspaceId");

  const rows = await db
    .select()
    .from(automations)
    .where(eq(automations.workspaceId, workspaceId));

  return c.json({ data: rows });
});

// GET /api/automations/:id
automationRoutes.get("/:id", async (c) => {
  const workspaceId = c.get("workspaceId");
  const id = c.req.param("id")!;

  const [automation] = await db
    .select()
    .from(automations)
    .where(
      and(
        eq(automations.id, id),
        eq(automations.workspaceId, workspaceId),
      ),
    )
    .limit(1);

  if (!automation) {
    return c.json({ error: "Automation not found" }, 404);
  }

  const steps = await db
    .select()
    .from(automationSteps)
    .where(eq(automationSteps.automationId, id));

  return c.json({
    data: {
      ...automation,
      steps,
    },
  });
});

// POST /api/automations
automationRoutes.post("/", async (c) => {
  const workspaceId = c.get("workspaceId");
  const body = await c.req.json();

  const [automation] = await db
    .insert(automations)
    .values({
      ...body,
      workspaceId,
    })
    .returning();

  return c.json({ data: automation }, 201);
});

// PUT /api/automations/:id
automationRoutes.put("/:id", async (c) => {
  const workspaceId = c.get("workspaceId");
  const id = c.req.param("id")!;
  const body = await c.req.json();

  const [automation] = await db
    .update(automations)
    .set({
      ...body,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(automations.id, id),
        eq(automations.workspaceId, workspaceId),
      ),
    )
    .returning();

  if (!automation) {
    return c.json({ error: "Automation not found" }, 404);
  }

  return c.json({ data: automation });
});

// DELETE /api/automations/:id (only if draft)
automationRoutes.delete("/:id", async (c) => {
  const workspaceId = c.get("workspaceId");
  const id = c.req.param("id")!;

  const [existing] = await db
    .select()
    .from(automations)
    .where(
      and(
        eq(automations.id, id),
        eq(automations.workspaceId, workspaceId),
      ),
    )
    .limit(1);

  if (!existing) {
    return c.json({ error: "Automation not found" }, 404);
  }

  if (existing.status !== "draft") {
    return c.json(
      { error: "Only draft automations can be deleted" },
      400,
    );
  }

  // Delete steps first, then the automation
  await db
    .delete(automationSteps)
    .where(eq(automationSteps.automationId, id));
  await db.delete(automations).where(eq(automations.id, id));

  return c.json({ success: true });
});

// POST /api/automations/:id/steps -- bulk upsert (delete existing, insert new)
automationRoutes.post("/:id/steps", async (c) => {
  const workspaceId = c.get("workspaceId");
  const id = c.req.param("id")!;

  const [automation] = await db
    .select()
    .from(automations)
    .where(
      and(
        eq(automations.id, id),
        eq(automations.workspaceId, workspaceId),
      ),
    )
    .limit(1);

  if (!automation) {
    return c.json({ error: "Automation not found" }, 404);
  }

  const { steps } = await c.req.json<{
    steps: Array<{
      type: string;
      config: Record<string, unknown>;
      positionX: number;
      positionY: number;
      parentStepId?: string;
      branch?: string;
    }>;
  }>();

  // Delete existing steps
  await db
    .delete(automationSteps)
    .where(eq(automationSteps.automationId, id));

  // Insert new steps
  let insertedSteps: (typeof automationSteps.$inferSelect)[] = [];
  if (steps && steps.length > 0) {
    insertedSteps = await db
      .insert(automationSteps)
      .values(
        steps.map((step) => ({
          automationId: id,
          type: step.type,
          config: step.config,
          positionX: step.positionX,
          positionY: step.positionY,
          parentStepId: step.parentStepId,
          branch: step.branch ?? "default",
        })),
      )
      .returning();
  }

  return c.json({ data: insertedSteps });
});

// POST /api/automations/:id/activate
automationRoutes.post("/:id/activate", async (c) => {
  const workspaceId = c.get("workspaceId");
  const id = c.req.param("id")!;

  const [automation] = await db
    .update(automations)
    .set({ status: "active", updatedAt: new Date() })
    .where(
      and(
        eq(automations.id, id),
        eq(automations.workspaceId, workspaceId),
      ),
    )
    .returning();

  if (!automation) {
    return c.json({ error: "Automation not found" }, 404);
  }

  return c.json({ data: automation });
});

// POST /api/automations/:id/deactivate
automationRoutes.post("/:id/deactivate", async (c) => {
  const workspaceId = c.get("workspaceId");
  const id = c.req.param("id")!;

  const [automation] = await db
    .update(automations)
    .set({ status: "paused", updatedAt: new Date() })
    .where(
      and(
        eq(automations.id, id),
        eq(automations.workspaceId, workspaceId),
      ),
    )
    .returning();

  if (!automation) {
    return c.json({ error: "Automation not found" }, 404);
  }

  return c.json({ data: automation });
});
