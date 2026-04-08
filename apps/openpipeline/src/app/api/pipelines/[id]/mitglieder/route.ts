import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/db";
import { eq } from "drizzle-orm";
import { requireVorgesetzter } from "@/lib/api-auth";

interface Params { params: Promise<{ id: string }> }

// GET /api/pipelines/:id/mitglieder
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { id: pipelineId } = await params;
    await requireVorgesetzter(pipelineId);

    const mitglieder = db
      .select()
      .from(schema.pipMitglieder)
      .where(eq(schema.pipMitglieder.pipelineId, pipelineId))
      .all();

    return NextResponse.json(mitglieder);
  } catch (e) {
    if (e instanceof Response) return e;
    throw e;
  }
}

// POST /api/pipelines/:id/mitglieder — Add a member
export async function POST(req: NextRequest, { params }: Params) {
  try {
    const { id: pipelineId } = await params;
    await requireVorgesetzter(pipelineId);

    const body = await req.json();
    const { userId, name, rolle, vertrauensLevel, zugewieseneStufen } = body;

    if (!userId) {
      return NextResponse.json({ error: "userId ist erforderlich" }, { status: 400 });
    }

    const mitgliedId = crypto.randomUUID();
    const now = new Date();

    db.insert(schema.pipMitglieder)
      .values({
        id: mitgliedId,
        pipelineId,
        userId,
        name: name ?? null,
        rolle: rolle ?? "zuarbeiter",
        vertrauensLevel: vertrauensLevel ?? 1,
        zugewieseneStufen: zugewieseneStufen ?? null,
        createdAt: now,
      })
      .run();

    const mitglied = db.select().from(schema.pipMitglieder).where(eq(schema.pipMitglieder.id, mitgliedId)).get();
    return NextResponse.json(mitglied, { status: 201 });
  } catch (e) {
    if (e instanceof Response) return e;
    throw e;
  }
}
