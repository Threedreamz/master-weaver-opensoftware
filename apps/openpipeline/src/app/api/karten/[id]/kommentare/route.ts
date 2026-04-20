import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/db";
import { eq, desc } from "drizzle-orm";
import { requirePipelineAccess } from "@/lib/api-auth";

interface Params { params: Promise<{ id: string }> }

// GET /api/karten/:id/kommentare
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { id: karteId } = await params;
    const karte = db.select().from(schema.pipKarten).where(eq(schema.pipKarten.id, karteId)).get();
    if (!karte) return NextResponse.json({ error: "Karte nicht gefunden" }, { status: 404 });

    await requirePipelineAccess(karte.pipelineId);

    const kommentare = db
      .select()
      .from(schema.pipKommentare)
      .where(eq(schema.pipKommentare.karteId, karteId))
      .orderBy(desc(schema.pipKommentare.createdAt))
      .all();

    return NextResponse.json(kommentare);
  } catch (e) {
    if (e instanceof Response) return e;
    throw e;
  }
}

// POST /api/karten/:id/kommentare
export async function POST(req: NextRequest, { params }: Params) {
  try {
    const { id: karteId } = await params;
    const karte = db.select().from(schema.pipKarten).where(eq(schema.pipKarten.id, karteId)).get();
    if (!karte) return NextResponse.json({ error: "Karte nicht gefunden" }, { status: 404 });

    const { userId } = await requirePipelineAccess(karte.pipelineId);

    const { inhalt } = await req.json();
    if (!inhalt?.trim()) {
      return NextResponse.json({ error: "inhalt ist erforderlich" }, { status: 400 });
    }

    // Extract @mentions from markdown content
    const mentionPattern = /@\[([^\]]+)\]\(([^)]+)\)/g;
    const erwaehnteUser: string[] = [];
    let match;
    while ((match = mentionPattern.exec(inhalt)) !== null) {
      erwaehnteUser.push(match[2]);
    }

    const id = crypto.randomUUID();
    db.insert(schema.pipKommentare)
      .values({
        id,
        karteId,
        userId,
        inhalt,
        erwaehnteUser: erwaehnteUser.length > 0 ? erwaehnteUser : null,
      })
      .run();

    // Record in card history
    db.insert(schema.pipKartenHistorie)
      .values({
        id: crypto.randomUUID(),
        karteId,
        aktion: "kommentar",
        userId,
        kommentar: inhalt.slice(0, 100),
      })
      .run();

    const kommentar = db.select().from(schema.pipKommentare).where(eq(schema.pipKommentare.id, id)).get();
    return NextResponse.json(kommentar, { status: 201 });
  } catch (e) {
    if (e instanceof Response) return e;
    throw e;
  }
}
