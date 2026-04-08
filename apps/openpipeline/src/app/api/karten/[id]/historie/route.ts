import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/db";
import { eq } from "drizzle-orm";

interface Params { params: Promise<{ id: string }> }

// GET /api/karten/:id/historie
export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const historie = db
    .select()
    .from(schema.pipKartenHistorie)
    .where(eq(schema.pipKartenHistorie.karteId, id))
    .all();

  return NextResponse.json(historie);
}
