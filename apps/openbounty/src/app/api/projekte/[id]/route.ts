import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { zleProjekte, zleZeiteintraege, zleAufgaben, zleLeistungen } from '@/db/schema'
import { eq, and, count, sql, desc } from 'drizzle-orm'

/** GET /api/projekte/[id] — Projekt-Detail mit Stats */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const [projekt] = await db.select().from(zleProjekte).where(eq(zleProjekte.id, id))
  if (!projekt) {
    return NextResponse.json({ error: 'Projekt nicht gefunden' }, { status: 404 })
  }

  const [zeitResult] = await db
    .select({ total: sql<number>`coalesce(sum(${zleZeiteintraege.dauer}), 0)` })
    .from(zleZeiteintraege)
    .where(and(eq(zleZeiteintraege.projektId, id), eq(zleZeiteintraege.geloescht, false)))

  const [todosResult] = await db
    .select({ count: count() })
    .from(zleAufgaben)
    .where(and(eq(zleAufgaben.projektId, id), eq(zleAufgaben.status, 'offen')))

  const [leistungenResult] = await db
    .select({ count: count() })
    .from(zleLeistungen)
    .where(eq(zleLeistungen.projektId, id))

  const recentEntries = await db
    .select()
    .from(zleZeiteintraege)
    .where(and(eq(zleZeiteintraege.projektId, id), eq(zleZeiteintraege.geloescht, false)))
    .orderBy(desc(zleZeiteintraege.startzeit))
    .limit(10)

  return NextResponse.json({
    ...projekt,
    gesamtStunden: Math.round(((zeitResult?.total ?? 0) / 3600) * 100) / 100,
    offeneTodos: todosResult?.count ?? 0,
    leistungen: leistungenResult?.count ?? 0,
    recentEntries,
  })
}

/** PUT /api/projekte/[id] — Projekt aktualisieren */
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()

  const [existing] = await db.select().from(zleProjekte).where(eq(zleProjekte.id, id))
  if (!existing) {
    return NextResponse.json({ error: 'Projekt nicht gefunden' }, { status: 404 })
  }

  await db
    .update(zleProjekte)
    .set({
      name: body.name ?? existing.name,
      kunde: body.kunde ?? existing.kunde,
      beschreibung: body.beschreibung ?? existing.beschreibung,
      budgetStunden: body.budgetStunden ?? existing.budgetStunden,
      stundensatz: body.stundensatz ?? existing.stundensatz,
      abrechenbar: body.abrechenbar ?? existing.abrechenbar,
      status: body.status ?? existing.status,
      color: body.color ?? existing.color,
      updatedAt: new Date(),
    })
    .where(eq(zleProjekte.id, id))

  const [updated] = await db.select().from(zleProjekte).where(eq(zleProjekte.id, id))
  return NextResponse.json(updated)
}
