import { Hono } from "hono";
import { z } from "zod";
import { db } from "@opensoftware/openmailer-db";
import { contacts, contactTags, tags } from "@opensoftware/openmailer-db/schema";
import { eq, and, sql, desc, asc } from "drizzle-orm";

interface ContactVariables {
  user: { id: string; email: string; name?: string; role?: string };
  workspaceId: string;
}

export const contactRoutes = new Hono<{ Variables: ContactVariables }>();

// GET /api/contacts
contactRoutes.get("/", async (c) => {
  const workspaceId = c.get("workspaceId");
  const page = Number(c.req.query("page") || "1");
  const limit = Math.min(Number(c.req.query("limit") || "50"), 100);
  const search = c.req.query("search");
  const status = c.req.query("status");
  const sortBy = c.req.query("sortBy") || "createdAt";
  const sortOrder = c.req.query("sortOrder") || "desc";
  const offset = (page - 1) * limit;

  const conditions = [eq(contacts.workspaceId, workspaceId)];

  if (status) {
    conditions.push(eq(contacts.status, status));
  }

  if (search) {
    conditions.push(
      sql`(${contacts.email} LIKE ${`%${search}%`} OR ${contacts.firstName} LIKE ${`%${search}%`} OR ${contacts.lastName} LIKE ${`%${search}%`})`,
    );
  }

  const where = and(...conditions);

  const sortColumn = (contacts as any)[sortBy] || contacts.createdAt;
  const orderFn = sortOrder === "asc" ? asc : desc;

  const [rows, countResult] = await Promise.all([
    db
      .select()
      .from(contacts)
      .where(where)
      .orderBy(orderFn(sortColumn))
      .limit(limit)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)` })
      .from(contacts)
      .where(where),
  ]);

  return c.json({
    data: rows,
    pagination: {
      page,
      limit,
      total: Number(countResult[0].count),
      totalPages: Math.ceil(Number(countResult[0].count) / limit),
    },
  });
});

// GET /api/contacts/:id
contactRoutes.get("/:id", async (c) => {
  const workspaceId = c.get("workspaceId");
  const id = c.req.param("id")!;

  const [contact] = await db
    .select()
    .from(contacts)
    .where(
      and(eq(contacts.id, id), eq(contacts.workspaceId, workspaceId)),
    )
    .limit(1);

  if (!contact) {
    return c.json({ error: "Contact not found" }, 404);
  }

  // Fetch tags for this contact
  const tagRows = await db
    .select({ tag: tags })
    .from(contactTags)
    .innerJoin(tags, eq(contactTags.tagId, tags.id))
    .where(eq(contactTags.contactId, id));

  return c.json({
    data: {
      ...contact,
      tags: tagRows.map((r) => r.tag),
    },
  });
});

// POST /api/contacts
contactRoutes.post("/", async (c) => {
  const workspaceId = c.get("workspaceId");
  const body = await c.req.json();

  const [contact] = await db
    .insert(contacts)
    .values({
      ...body,
      workspaceId,
    })
    .returning();

  return c.json({ data: contact }, 201);
});

// PUT /api/contacts/:id
contactRoutes.put("/:id", async (c) => {
  const workspaceId = c.get("workspaceId");
  const id = c.req.param("id")!;
  const body = await c.req.json();

  const [contact] = await db
    .update(contacts)
    .set({
      ...body,
      updatedAt: new Date(),
    })
    .where(
      and(eq(contacts.id, id), eq(contacts.workspaceId, workspaceId)),
    )
    .returning();

  if (!contact) {
    return c.json({ error: "Contact not found" }, 404);
  }

  return c.json({ data: contact });
});

// DELETE /api/contacts/:id (soft delete)
contactRoutes.delete("/:id", async (c) => {
  const workspaceId = c.get("workspaceId");
  const id = c.req.param("id")!;

  const [contact] = await db
    .update(contacts)
    .set({
      status: "inactive",
      updatedAt: new Date(),
    })
    .where(
      and(eq(contacts.id, id), eq(contacts.workspaceId, workspaceId)),
    )
    .returning();

  if (!contact) {
    return c.json({ error: "Contact not found" }, 404);
  }

  return c.json({ data: contact });
});

// POST /api/contacts/:id/tags
contactRoutes.post("/:id/tags", async (c) => {
  const id = c.req.param("id")!;
  const { tagIds } = z
    .object({ tagIds: z.array(z.string().uuid()) })
    .parse(await c.req.json());

  const values = tagIds.map((tagId) => ({
    contactId: id,
    tagId,
  }));

  await db.insert(contactTags).values(values).onConflictDoNothing();

  return c.json({ success: true }, 201);
});

// DELETE /api/contacts/:id/tags/:tagId
contactRoutes.delete("/:id/tags/:tagId", async (c) => {
  const contactId = c.req.param("id")!;
  const tagId = c.req.param("tagId")!;

  await db
    .delete(contactTags)
    .where(
      and(
        eq(contactTags.contactId, contactId),
        eq(contactTags.tagId, tagId),
      ),
    );

  return c.json({ success: true });
});
