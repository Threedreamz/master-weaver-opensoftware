import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/db";
import { eq } from "drizzle-orm";

interface Params { params: Promise<{ id: string }> }

// GET /api/pipelines/:id/karten — All cards in pipeline
export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const karten = db
    .select()
    .from(schema.pipKarten)
    .where(eq(schema.pipKarten.pipelineId, id))
    .all();

  return NextResponse.json(karten);
}
