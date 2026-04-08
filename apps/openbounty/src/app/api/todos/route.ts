import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { zleAufgaben } from '@/db/schema'
import { eq, and, asc, desc } from 'drizzle-orm'
import { newId } from '@/lib/ids'

/** GET /api/todos — Liste mit Filtern */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams
  const status = sp.get('status')
  const projektId = sp.get('projektId')
  const userId = sp.get('userId')
  const quelle = sp.get('quelle')
  const arbeitsplatzId = sp.get('arbeitsplatzId')

  const conditions = []
  if (status) conditions.push(eq(zleAufgaben.status, status as never))
  if (projektId) conditions.push(eq(zleAufgaben.projektId, projektId))
  if (userId) conditions.push(eq(zleAufgaben.userId, userId))
  if (quelle) conditions.push(eq(zleAufgaben.quelle, quelle as never))
  if (arbeitsplatzId) conditions.push(eq(zleAufgaben.arbeitsplatzId, arbeitsplatzId))

  const result = await db
    .select()
    .from(zleAufgaben)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(asc(zleAufgaben.prioritaet), desc(zleAufgaben.createdAt))
    .limit(100)

  return NextResponse.json(result)
}

/** POST /api/todos — Neues TODO erstellen */
export async function POST(req: NextRequest) {
  const body = await req.json()
  if (!body.titel) {
    return NextResponse.json({ error: 'titel ist erforderlich' }, { status: 400 })
  }

  const id = newId()
  await db.insert(zleAufgaben).values({
    id,
    projektId: body.projektId ?? null,
    userId: body.userId ?? 'dev-user-1',
    titel: body.titel,
    beschreibung: body.beschreibung ?? null,
    prioritaet: body.prioritaet ?? 'mittel',
    status: 'offen',
    geschaetztStunden: body.geschaetztStunden ?? null,
    quelle: body.quelle ?? 'manuell',
    quelleReferenz: body.quelleReferenz ?? null,
    arbeitsplatzId: body.arbeitsplatzId ?? null,
    faelligAm: body.faelligAm ? new Date(body.faelligAm) : null,
  })

  const [created] = await db.select().from(zleAufgaben).where(eq(zleAufgaben.id, id))
  return NextResponse.json(created, { status: 201 })
}
