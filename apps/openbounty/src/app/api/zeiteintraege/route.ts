import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { zleZeiteintraege } from '@/db/schema'
import { eq, and, gte, lte, desc } from 'drizzle-orm'
import { newId } from '@/lib/ids'

/** GET /api/zeiteintraege — Liste (Filter: von, bis, userId, projektId, typ) */
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const von = searchParams.get('von')
  const bis = searchParams.get('bis')

  let query = db.select().from(zleZeiteintraege).where(eq(zleZeiteintraege.geloescht, false))

  // Note: In production, add proper filtering with drizzle where clauses
  // For now, return recent entries
  const result = await db
    .select()
    .from(zleZeiteintraege)
    .where(eq(zleZeiteintraege.geloescht, false))
    .orderBy(desc(zleZeiteintraege.startzeit))
    .limit(100)

  return NextResponse.json(result)
}

/** POST /api/zeiteintraege — Manueller Eintrag */
export async function POST(req: NextRequest) {
  const body = await req.json()
  const now = new Date()

  const id = newId()
  await db.insert(zleZeiteintraege).values({
    id,
    userId: body.userId ?? 'dev-user-1',
    projektId: body.projektId ?? null,
    aufgabeId: body.aufgabeId ?? null,
    startzeit: new Date(body.startzeit),
    endzeit: body.endzeit ? new Date(body.endzeit) : null,
    dauer: body.dauer ?? null,
    beschreibung: body.beschreibung ?? null,
    abrechenbar: body.abrechenbar ?? true,
    typ: body.typ ?? 'manuell',
    quelle: body.quelle ?? 'manuell',
    quelleId: body.quelleId ?? null,
    arbeitsplatzId: body.arbeitsplatzId ?? null,
    geloescht: false,
  })

  const [created] = await db
    .select()
    .from(zleZeiteintraege)
    .where(eq(zleZeiteintraege.id, id))

  return NextResponse.json(created, { status: 201 })
}
