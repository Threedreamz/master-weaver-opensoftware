import { Hono } from "hono";
import { db } from "@opensoftware/openmailer-db";
import { forms, contacts } from "@opensoftware/openmailer-db/schema";
import { eq, and } from "drizzle-orm";
import { authMiddleware } from "../middleware/auth.js";
import { workspaceMiddleware } from "../middleware/workspace.js";

interface FormVariables {
  user: { id: string; email: string; name?: string; role?: string };
  workspaceId: string;
}

export const formRoutes = new Hono<{ Variables: FormVariables }>();

// GET /api/forms (auth + workspace required)
formRoutes.get("/", authMiddleware, workspaceMiddleware, async (c) => {
  const workspaceId = c.get("workspaceId");

  const rows = await db
    .select()
    .from(forms)
    .where(eq(forms.workspaceId, workspaceId));

  return c.json({ data: rows });
});

// GET /api/forms/:id (auth + workspace required)
formRoutes.get("/:id", authMiddleware, workspaceMiddleware, async (c) => {
  const workspaceId = c.get("workspaceId");
  const id = c.req.param("id")!;

  const [form] = await db
    .select()
    .from(forms)
    .where(and(eq(forms.id, id), eq(forms.workspaceId, workspaceId)))
    .limit(1);

  if (!form) {
    return c.json({ error: "Form not found" }, 404);
  }

  return c.json({ data: form });
});

// POST /api/forms (auth + workspace required)
formRoutes.post("/", authMiddleware, workspaceMiddleware, async (c) => {
  const workspaceId = c.get("workspaceId");
  const body = await c.req.json();

  const [form] = await db
    .insert(forms)
    .values({
      ...body,
      workspaceId,
    })
    .returning();

  return c.json({ data: form }, 201);
});

// PUT /api/forms/:id (auth + workspace required)
formRoutes.put("/:id", authMiddleware, workspaceMiddleware, async (c) => {
  const workspaceId = c.get("workspaceId");
  const id = c.req.param("id")!;
  const body = await c.req.json();

  const [form] = await db
    .update(forms)
    .set({
      ...body,
      updatedAt: new Date(),
    })
    .where(and(eq(forms.id, id), eq(forms.workspaceId, workspaceId)))
    .returning();

  if (!form) {
    return c.json({ error: "Form not found" }, 404);
  }

  return c.json({ data: form });
});

// DELETE /api/forms/:id (auth + workspace required)
formRoutes.delete(
  "/:id",
  authMiddleware,
  workspaceMiddleware,
  async (c) => {
    const workspaceId = c.get("workspaceId");
    const id = c.req.param("id")!;

    const [form] = await db
      .delete(forms)
      .where(and(eq(forms.id, id), eq(forms.workspaceId, workspaceId)))
      .returning();

    if (!form) {
      return c.json({ error: "Form not found" }, 404);
    }

    return c.json({ data: form });
  },
);

// POST /api/forms/:id/submit -- public endpoint, no auth required
formRoutes.post("/:id/submit", async (c) => {
  const id = c.req.param("id")!;

  const [form] = await db
    .select()
    .from(forms)
    .where(eq(forms.id, id))
    .limit(1);

  if (!form) {
    return c.json({ error: "Form not found" }, 404);
  }

  const body = await c.req.json();
  const email = body.email;

  if (!email || typeof email !== "string") {
    return c.json({ error: "Email is required" }, 400);
  }

  // Upsert contact -- create or update
  const existing = await db
    .select()
    .from(contacts)
    .where(
      and(
        eq(contacts.email, email),
        eq(contacts.workspaceId, form.workspaceId),
      ),
    )
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(contacts)
      .set({
        firstName: body.firstName || existing[0].firstName,
        lastName: body.lastName || existing[0].lastName,
        updatedAt: new Date(),
      })
      .where(eq(contacts.id, existing[0].id));
  } else {
    await db.insert(contacts).values({
      email,
      firstName: body.firstName,
      lastName: body.lastName,
      workspaceId: form.workspaceId,
      emailConsent: true,
      trackingConsent: true,
    });
  }

  return c.json({ success: true, message: "Submission received" }, 201);
});
