import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/db";
import { eq } from "drizzle-orm";
import { requireVorgesetzter } from "@/lib/api-auth";

interface Params { params: Promise<{ id: string }> }

// POST /api/pipelines/:id/stufen/reorder
export async function POST(req: NextRequest, { params }: Params) {
  try {
    const { id: pipelineId } = await params;
    await requireVorgesetzter(pipelineId);

    const { stufenIds } = await req.json();
    if (!Array.isArray(stufenIds) || stufenIds.length === 0) {
      return NextResponse.json({ error: "stufenIds Array ist erforderlich" }, { status: 400 });
    }

    for (let i = 0; i < stufenIds.length; i++) {
      db.update(schema.pipStufen)
        .set({ position: i, updatedAt: new Date() })
        .where(eq(schema.pipStufen.id, stufenIds[i]))
        .run();
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof Response) return e;
    throw e;
  }
}
