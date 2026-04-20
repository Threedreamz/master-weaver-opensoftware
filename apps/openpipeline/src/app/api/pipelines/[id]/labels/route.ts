import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/db";
import { eq } from "drizzle-orm";
import { requirePipelineAccess, requireVorgesetzter } from "@/lib/api-auth";

interface Params { params: Promise<{ id: string }> }

// GET /api/pipelines/:id/labels
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { id: pipelineId } = await params;
    await requirePipelineAccess(pipelineId);

    const labels = db
      .select()
      .from(schema.pipLabels)
      .where(eq(schema.pipLabels.pipelineId, pipelineId))
      .all();

    return NextResponse.json(labels);
  } catch (e) {
    if (e instanceof Response) return e;
    throw e;
  }
}

// POST /api/pipelines/:id/labels
export async function POST(req: NextRequest, { params }: Params) {
  try {
    const { id: pipelineId } = await params;
    await requireVorgesetzter(pipelineId);

    const { name, farbe } = await req.json();
    if (!name || !farbe) {
      return NextResponse.json({ error: "name und farbe sind erforderlich" }, { status: 400 });
    }

    const id = crypto.randomUUID();
    db.insert(schema.pipLabels).values({ id, pipelineId, name, farbe }).run();

    const label = db.select().from(schema.pipLabels).where(eq(schema.pipLabels.id, id)).get();
    return NextResponse.json(label, { status: 201 });
  } catch (e) {
    if (e instanceof Response) return e;
    throw e;
  }
}
