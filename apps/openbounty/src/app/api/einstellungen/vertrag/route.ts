import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { zleArbeitsvertraege } from '@/db/schema'
import { eq, and, isNull, desc } from 'drizzle-orm'
import { newId } from '@/lib/ids'

/** GET /api/einstellungen/vertrag — Aktuellen Arbeitsvertrag laden */
export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('userId') ?? 'dev-user-1'

  const [vertrag] = await db
    .select()
    .from(zleArbeitsvertraege)
    .where(and(eq(zleArbeitsvertraege.userId, userId), isNull(zleArbeitsvertraege.gueltigBis)))
    .orderBy(desc(zleArbeitsvertraege.createdAt))
    .limit(1)

  if (!vertrag) {
    return NextResponse.json(null)
  }

  return NextResponse.json(vertrag)
}

/** PUT /api/einstellungen/vertrag — Vertrag anlegen/aktualisieren */
export async function PUT(req: NextRequest) {
  const body = await req.json()
  const userId = body.userId ?? 'dev-user-1'

  // Close existing active contract
  const [existing] = await db
    .select()
    .from(zleArbeitsvertraege)
    .where(and(eq(zleArbeitsvertraege.userId, userId), isNull(zleArbeitsvertraege.gueltigBis)))
    .limit(1)

  if (existing) {
    await db
      .update(zleArbeitsvertraege)
      .set({ gueltigBis: new Date().toISOString().slice(0, 10) })
      .where(eq(zleArbeitsvertraege.id, existing.id))
  }

  const id = newId()
  await db.insert(zleArbeitsvertraege).values({
    id,
    userId,
    wochenstunden: body.wochenstunden ?? 40,
    tagstunden: body.tagstunden ?? 8,
    urlaubstage: body.urlaubstage ?? 30,
    gueltigAb: body.gueltigAb ?? new Date().toISOString().slice(0, 10),
    gueltigBis: null,
    ueberstundenRegelung: body.ueberstundenRegelung ?? 'beides',
  })

  const [created] = await db.select().from(zleArbeitsvertraege).where(eq(zleArbeitsvertraege.id, id))
  return NextResponse.json(created)
}
