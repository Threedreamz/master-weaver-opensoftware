import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { deskVorgaenge, deskVorgangHistory } from "@/db/schema";
import { desc, sql } from "drizzle-orm";

function authenticate(req: NextRequest): boolean {
  const apiKey = process.env.OPENDESKTOP_API_KEY;
  if (!apiKey) return true; // No key configured — open in dev
  const auth = req.headers.get("authorization");
  return auth === `Bearer ${apiKey}`;
}

/**
 * GET /api/v1/vorgaenge
 * List vorgaenge with pagination. Query params: limit, offset, status
 */
export async function GET(req: NextRequest) {
  if (!authenticate(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = req.nextUrl;
  const limit = Math.min(Number(searchParams.get("limit") || "50"), 200);
  const offset = Number(searchParams.get("offset") || "0");
  const status = searchParams.get("status");

  const rows = await db.query.deskVorgaenge.findMany({
    where: status ? (v, { eq }) => eq(v.globalStatus, status as never) : undefined,
    orderBy: [desc(deskVorgaenge.createdAt)],
    limit,
    offset,
    with: {
      currentModule: true,
      flow: { columns: { id: true, name: true, status: true } },
    },
  });

  const total = await db
    .select({ count: sql<number>`count(*)` })
    .from(deskVorgaenge)
    .then((r) => r[0]?.count ?? 0);

  return NextResponse.json({ data: rows, total, limit, offset });
}

/**
 * POST /api/v1/vorgaenge
 * Create a new Vorgang
 * Body: { title, description?, priority?, deadline?, flowId? }
 */
export async function POST(req: NextRequest) {
  if (!authenticate(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const title = body.title as string | undefined;
  if (!title) {
    return NextResponse.json({ error: "title is required" }, { status: 400 });
  }

  const year = new Date().getFullYear();
  const countResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(deskVorgaenge);
  const num = (countResult[0]?.count ?? 0) + 1;
  const globalId = `VG-${year}-${String(num).padStart(4, "0")}`;

  const deadline = body.deadline ? new Date(body.deadline as string) : undefined;

  const result = await db
    .insert(deskVorgaenge)
    .values({
      globalId,
      title,
      description: (body.description as string) || null,
      priority: (body.priority as "low" | "medium" | "high" | "critical") || "medium",
      deadline,
      globalStatus: "entwurf",
      flowId: (body.flowId as string) || null,
    })
    .returning();

  const created = result[0];

  await db.insert(deskVorgangHistory).values({
    vorgangId: created.id,
    action: "created",
    newStatus: "entwurf",
    comment: `Erstellt über API${body.source ? ` (${body.source})` : ""}`,
  });

  return NextResponse.json({ data: created }, { status: 201 });
}
