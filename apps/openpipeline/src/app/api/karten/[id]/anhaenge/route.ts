import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/db";
import { eq } from "drizzle-orm";
import { requirePipelineAccess } from "@/lib/api-auth";
import { saveFile, deleteFile } from "@/lib/file-storage";

interface Params { params: Promise<{ id: string }> }

// GET /api/karten/:id/anhaenge
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { id: karteId } = await params;
    const karte = db.select().from(schema.pipKarten).where(eq(schema.pipKarten.id, karteId)).get();
    if (!karte) return NextResponse.json({ error: "Karte nicht gefunden" }, { status: 404 });

    await requirePipelineAccess(karte.pipelineId);

    const anhaenge = db
      .select()
      .from(schema.pipAnhaenge)
      .where(eq(schema.pipAnhaenge.karteId, karteId))
      .all();

    return NextResponse.json(anhaenge);
  } catch (e) {
    if (e instanceof Response) return e;
    throw e;
  }
}

// POST /api/karten/:id/anhaenge — upload file
export async function POST(req: NextRequest, { params }: Params) {
  try {
    const { id: karteId } = await params;
    const karte = db.select().from(schema.pipKarten).where(eq(schema.pipKarten.id, karteId)).get();
    if (!karte) return NextResponse.json({ error: "Karte nicht gefunden" }, { status: 404 });

    const { userId } = await requirePipelineAccess(karte.pipelineId);

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "file ist erforderlich" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const { dateiname, pfad } = await saveFile(buffer, file.name, karteId);

    const id = crypto.randomUUID();
    db.insert(schema.pipAnhaenge)
      .values({
        id,
        karteId,
        dateiname,
        originalname: file.name,
        groesse: file.size,
        mimetype: file.type || "application/octet-stream",
        pfad,
        hochgeladenVon: userId,
      })
      .run();

    const anhang = db.select().from(schema.pipAnhaenge).where(eq(schema.pipAnhaenge.id, id)).get();
    return NextResponse.json(anhang, { status: 201 });
  } catch (e) {
    if (e instanceof Response) return e;
    throw e;
  }
}
