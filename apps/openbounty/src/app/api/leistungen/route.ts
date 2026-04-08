import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { zleLeistungen } from '@/db/schema'
import { eq, and, gte, lte, desc } from 'drizzle-orm'
import { newId } from '@/lib/ids'

/** GET /api/leistungen — Liste mit Filtern */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams
  const userId = sp.get('userId')
  const projektId = sp.get('projektId')
  const typ = sp.get('typ')
  const von = sp.get('von')
  const bis = sp.get('bis')

  const conditions = []
  if (userId) conditions.push(eq(zleLeistungen.userId, userId))
  if (projektId) conditions.push(eq(zleLeistungen.projektId, projektId))
  if (typ) conditions.push(eq(zleLeistungen.typ, typ as never))
  if (von) conditions.push(gte(zleLeistungen.erfasstAm, new Date(von)))
  if (bis) conditions.push(lte(zleLeistungen.erfasstAm, new Date(bis)))

  const result = await db
    .select()
    .from(zleLeistungen)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(zleLeistungen.erfasstAm))
    .limit(100)

  return NextResponse.json(result)
}

/** POST /api/leistungen — Neue Leistung erfassen */
export async function POST(req: NextRequest) {
  const body = await req.json()
  if (!body.typ || !body.titel) {
    return NextResponse.json({ error: 'typ und titel sind erforderlich' }, { status: 400 })
  }

  const id = newId()
  await db.insert(zleLeistungen).values({
    id,
    userId: body.userId ?? 'dev-user-1',
    projektId: body.projektId ?? null,
    aufgabeId: body.aufgabeId ?? null,
    typ: body.typ,
    titel: body.titel,
    beschreibung: body.beschreibung ?? null,
    referenz: body.referenz ?? null,
    metadata: body.metadata ?? null,
    erfasstAm: body.erfasstAm ? new Date(body.erfasstAm) : new Date(),
  })

  const [created] = await db.select().from(zleLeistungen).where(eq(zleLeistungen.id, id))
  return NextResponse.json(created, { status: 201 })
}
