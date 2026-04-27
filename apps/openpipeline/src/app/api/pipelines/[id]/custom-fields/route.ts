import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/db";
import { eq } from "drizzle-orm";
import { requirePipelineAccess, requireVorgesetzter } from "@/lib/api-auth";

interface Params { params: Promise<{ id: string }> }

// GET /api/pipelines/:id/custom-fields
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { id: pipelineId } = await params;
    await requirePipelineAccess(pipelineId);

    const fields = db
      .select()
      .from(schema.pipCustomFieldDefinitionen)
      .where(eq(schema.pipCustomFieldDefinitionen.pipelineId, pipelineId))
      .all();

    return NextResponse.json(fields);
  } catch (e) {
    if (e instanceof Response) return e;
    throw e;
  }
}

// POST /api/pipelines/:id/custom-fields
export async function POST(req: NextRequest, { params }: Params) {
  try {
    const { id: pipelineId } = await params;
    await requireVorgesetzter(pipelineId);

    const { name, typ, optionen, istPrio, position, pflichtfeld } = await req.json();
    if (!name || !typ) {
      return NextResponse.json({ error: "name und typ sind erforderlich" }, { status: 400 });
    }

    const validTypes = ["text", "zahl", "dropdown", "checkbox"];
    if (!validTypes.includes(typ)) {
      return NextResponse.json({ error: `typ muss einer von ${validTypes.join(", ")} sein` }, { status: 400 });
    }

    if (typ === "dropdown" && (!optionen || !Array.isArray(optionen) || optionen.length === 0)) {
      return NextResponse.json({ error: "dropdown-Felder brauchen optionen" }, { status: 400 });
    }

    const id = crypto.randomUUID();
    db.insert(schema.pipCustomFieldDefinitionen)
      .values({
        id,
        pipelineId,
        name,
        typ,
        optionen: typ === "dropdown" ? optionen : null,
        istPrio: istPrio ?? false,
        position: position ?? 0,
        pflichtfeld: pflichtfeld ?? false,
      })
      .run();

    const field = db.select().from(schema.pipCustomFieldDefinitionen).where(eq(schema.pipCustomFieldDefinitionen.id, id)).get();
    return NextResponse.json(field, { status: 201 });
  } catch (e) {
    if (e instanceof Response) return e;
    throw e;
  }
}
