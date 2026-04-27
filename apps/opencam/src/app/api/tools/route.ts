export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { db, schema } from "@/db";
import { asc, eq } from "drizzle-orm";
import { ToolCreateBody } from "@/lib/api-contracts";

function serializeTool(row: typeof schema.opencamTools.$inferSelect) {
  return {
    id: row.id,
    name: row.name,
    kind: row.kind,
    diameterMm: row.diameterMm,
    fluteCount: row.fluteCount,
    lengthMm: row.lengthMm,
    material: row.material ?? undefined,
    shopId: row.shopId ?? undefined,
  };
}

/* GET /api/tools — list tools owned by the caller. */
export async function GET(_req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = (session.user as { id: string }).id;

  const rows = await db
    .select()
    .from(schema.opencamTools)
    .where(eq(schema.opencamTools.userId, userId))
    .orderBy(asc(schema.opencamTools.name));

  return NextResponse.json({ items: rows.map(serializeTool) });
}

/* POST /api/tools — create a tool owned by the caller. */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = (session.user as { id: string }).id;

  const json = await req.json().catch(() => null);
  const parsed = ToolCreateBody.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_body", details: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const body = parsed.data;

  const [row] = await db
    .insert(schema.opencamTools)
    .values({
      userId,
      name: body.name,
      kind: body.kind,
      diameterMm: body.diameterMm,
      fluteCount: body.fluteCount,
      lengthMm: body.lengthMm,
      material: body.material ?? null,
      shopId: body.shopId ?? null,
    })
    .returning();

  return NextResponse.json(serializeTool(row), { status: 201 });
}
