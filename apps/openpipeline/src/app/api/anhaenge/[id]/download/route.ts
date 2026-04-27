import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/db";
import { eq } from "drizzle-orm";
import { streamFile } from "@/lib/file-storage";

interface Params { params: Promise<{ id: string }> }

// GET /api/anhaenge/:id/download
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const anhang = db.select().from(schema.pipAnhaenge).where(eq(schema.pipAnhaenge.id, id)).get();
    if (!anhang) {
      return NextResponse.json({ error: "Anhang nicht gefunden" }, { status: 404 });
    }

    const fileBuffer = await streamFile(anhang.pfad);
    if (!fileBuffer) {
      return NextResponse.json({ error: "Datei nicht gefunden" }, { status: 404 });
    }

    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": anhang.mimetype,
        "Content-Disposition": `attachment; filename="${encodeURIComponent(anhang.originalname)}"`,
        "Content-Length": anhang.groesse.toString(),
      },
    });
  } catch (e) {
    if (e instanceof Response) return e;
    throw e;
  }
}
