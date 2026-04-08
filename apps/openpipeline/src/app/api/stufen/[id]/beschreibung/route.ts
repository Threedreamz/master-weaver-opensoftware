import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/db";
import { eq } from "drizzle-orm";
import { requirePipelineAccess, requireVorgesetzter } from "@/lib/api-auth";

interface Params { params: Promise<{ id: string }> }

// GET /api/stufen/:id/beschreibung
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { id: stufeId } = await params;

    const stufe = db.select().from(schema.pipStufen).where(eq(schema.pipStufen.id, stufeId)).get();
    if (!stufe) return NextResponse.json({ error: "Stufe nicht gefunden" }, { status: 404 });

    await requirePipelineAccess(stufe.pipelineId);

    const beschreibung = db
      .select()
      .from(schema.pipListenbeschreibung)
      .where(eq(schema.pipListenbeschreibung.stufeId, stufeId))
      .get();

    if (!beschreibung) return NextResponse.json({ error: "Keine Beschreibung vorhanden" }, { status: 404 });
    return NextResponse.json(beschreibung);
  } catch (e) {
    if (e instanceof Response) return e;
    throw e;
  }
}

// PUT /api/stufen/:id/beschreibung — Create or update (upsert)
export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const { id: stufeId } = await params;

    const stufe = db.select().from(schema.pipStufen).where(eq(schema.pipStufen.id, stufeId)).get();
    if (!stufe) return NextResponse.json({ error: "Stufe nicht gefunden" }, { status: 404 });

    const { userId } = await requireVorgesetzter(stufe.pipelineId);

    const body = await req.json();
    const { was, warum, wie, videoUrl, videoTitel, istEngpass, verantwortlicherUserId, onboardingCheckliste } = body;

    if (!was) {
      return NextResponse.json({ error: "\"was\" ist erforderlich" }, { status: 400 });
    }

    const now = new Date();
    const existing = db
      .select()
      .from(schema.pipListenbeschreibung)
      .where(eq(schema.pipListenbeschreibung.stufeId, stufeId))
      .get();

    if (existing) {
      db.update(schema.pipListenbeschreibung)
        .set({
          was,
          warum: warum ?? null,
          wie: wie ?? null,
          videoUrl: videoUrl ?? null,
          videoTitel: videoTitel ?? null,
          istEngpass: istEngpass ?? false,
          verantwortlicherUserId: verantwortlicherUserId ?? null,
          onboardingCheckliste: onboardingCheckliste ?? null,
          updatedAt: now,
        })
        .where(eq(schema.pipListenbeschreibung.stufeId, stufeId))
        .run();
    } else {
      db.insert(schema.pipListenbeschreibung)
        .values({
          id: crypto.randomUUID(),
          stufeId,
          was,
          warum: warum ?? null,
          wie: wie ?? null,
          videoUrl: videoUrl ?? null,
          videoTitel: videoTitel ?? null,
          istEngpass: istEngpass ?? false,
          verantwortlicherUserId: verantwortlicherUserId ?? null,
          onboardingCheckliste: onboardingCheckliste ?? null,
          erstelltVon: userId,
          createdAt: now,
          updatedAt: now,
        })
        .run();
    }

    const result = db
      .select()
      .from(schema.pipListenbeschreibung)
      .where(eq(schema.pipListenbeschreibung.stufeId, stufeId))
      .get();

    return NextResponse.json(result, { status: existing ? 200 : 201 });
  } catch (e) {
    if (e instanceof Response) return e;
    throw e;
  }
}

// DELETE /api/stufen/:id/beschreibung
export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const { id: stufeId } = await params;

    const stufe = db.select().from(schema.pipStufen).where(eq(schema.pipStufen.id, stufeId)).get();
    if (!stufe) return NextResponse.json({ error: "Stufe nicht gefunden" }, { status: 404 });

    await requireVorgesetzter(stufe.pipelineId);

    db.delete(schema.pipListenbeschreibung)
      .where(eq(schema.pipListenbeschreibung.stufeId, stufeId))
      .run();

    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof Response) return e;
    throw e;
  }
}
