import { NextResponse, type NextRequest } from "next/server";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { scannedMail, mailEvent } from "@/db/schema";
import { requireApiKey } from "@/lib/auth";

/**
 * GET    /api/scans/:id — fetch one scan + its event log
 * PATCH  /api/scans/:id — update mutable fields (unread, tags, classification)
 */

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = requireApiKey(req);
  if (!auth.ok) return auth.res;
  const { tenantId } = auth;
  const { id } = await params;

  const db = getDb();
  const [row] = await db
    .select()
    .from(scannedMail)
    .where(and(eq(scannedMail.id, id), eq(scannedMail.tenantId, tenantId)))
    .limit(1);

  if (!row) return NextResponse.json({ error: "not found" }, { status: 404 });

  const events = await db
    .select()
    .from(mailEvent)
    .where(and(eq(mailEvent.mailId, id), eq(mailEvent.tenantId, tenantId)));

  return NextResponse.json({ mail: row, events });
}

interface PatchBody {
  unread?: boolean;
  tags?: string[];
  classification?: "rechnung" | "vertrag" | "behoerde" | "werbung" | "unknown";
  shredded?: boolean;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = requireApiKey(req);
  if (!auth.ok) return auth.res;
  const { tenantId } = auth;
  const { id } = await params;

  let body: PatchBody;
  try {
    body = (await req.json()) as PatchBody;
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const patch: Partial<typeof scannedMail.$inferInsert> = {};
  if (typeof body.unread === "boolean") patch.unread = body.unread;
  if (Array.isArray(body.tags)) patch.tags = body.tags;
  if (body.classification) patch.classification = body.classification;
  if (typeof body.shredded === "boolean") patch.shredded = body.shredded;

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "no updatable fields" }, { status: 400 });
  }

  const db = getDb();
  const result = await db
    .update(scannedMail)
    .set(patch)
    .where(and(eq(scannedMail.id, id), eq(scannedMail.tenantId, tenantId)))
    .returning({ id: scannedMail.id });

  if (result.length === 0) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
