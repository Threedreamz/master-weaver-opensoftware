import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { deskVorgaenge, deskVorgangHistory } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

function authenticate(req: NextRequest): boolean {
  const apiKey = process.env.OPENDESKTOP_API_KEY;
  if (!apiKey) return true;
  const auth = req.headers.get("authorization");
  return auth === `Bearer ${apiKey}`;
}

/**
 * GET /api/v1/vorgaenge/:id
 * Get full Vorgang detail with history, comments, tasks
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!authenticate(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const vorgang = await db.query.deskVorgaenge.findFirst({
    where: (v, { eq }) => eq(v.id, id),
    with: {
      currentModule: true,
      flow: { columns: { id: true, name: true, status: true } },
      history: { orderBy: [desc(deskVorgangHistory.createdAt)], limit: 50 },
      comments: { orderBy: (c, { desc }) => [desc(c.createdAt)] },
      tasks: true,
      files: true,
    },
  });

  if (!vorgang) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ data: vorgang });
}

/**
 * PATCH /api/v1/vorgaenge/:id
 * Update Vorgang fields (title, description, priority, deadline, assignedTo)
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!authenticate(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const existing = await db.query.deskVorgaenge.findFirst({
    where: (v, { eq }) => eq(v.id, id),
  });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const allowed = ["title", "description", "priority", "deadline", "assignedTo"] as const;
  const updates: Record<string, unknown> = { updatedAt: new Date() };
  for (const key of allowed) {
    if (key in body) updates[key] = body[key];
  }

  const result = await db
    .update(deskVorgaenge)
    .set(updates as never)
    .where(eq(deskVorgaenge.id, id))
    .returning();

  if (body.assignedTo !== undefined) {
    await db.insert(deskVorgangHistory).values({
      vorgangId: id,
      action: "assigned",
      comment: body.assignedTo ? `Zugewiesen an: ${body.assignedTo} (API)` : "Zuweisung aufgehoben (API)",
    });
  }

  return NextResponse.json({ data: result[0] });
}
