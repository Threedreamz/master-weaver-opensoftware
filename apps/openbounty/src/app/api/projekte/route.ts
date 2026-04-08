import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { zleProjekte, zleZeiteintraege, zleAufgaben } from '@/db/schema'
import { eq, and, count, sql } from 'drizzle-orm'
import { newId } from '@/lib/ids'

/** GET /api/projekte — Liste mit Stats */
export async function GET() {
  const projekte = await db.select().from(zleProjekte)

  const result = await Promise.all(
    projekte.map(async (p) => {
      const [zeitResult] = await db
        .select({ total: sql<number>`coalesce(sum(${zleZeiteintraege.dauer}), 0)` })
        .from(zleZeiteintraege)
        .where(and(eq(zleZeiteintraege.projektId, p.id), eq(zleZeiteintraege.geloescht, false)))

      const [todosResult] = await db
        .select({ count: count() })
        .from(zleAufgaben)
        .where(and(eq(zleAufgaben.projektId, p.id), eq(zleAufgaben.status, 'offen')))

      return {
        ...p,
        gesamtStunden: Math.round(((zeitResult?.total ?? 0) / 3600) * 100) / 100,
        offeneTodos: todosResult?.count ?? 0,
      }
    }),
  )

  return NextResponse.json(result)
}

/** POST /api/projekte — Neues Projekt */
export async function POST(req: NextRequest) {
  const body = await req.json()
  if (!body.name) {
    return NextResponse.json({ error: 'name ist erforderlich' }, { status: 400 })
  }

  const id = newId()
  await db.insert(zleProjekte).values({
    id,
    name: body.name,
    kunde: body.kunde ?? null,
    ecosystemId: body.ecosystemId ?? null,
    beschreibung: body.beschreibung ?? null,
    budgetStunden: body.budgetStunden ?? null,
    stundensatz: body.stundensatz ?? null,
    abrechenbar: body.abrechenbar ?? true,
    status: body.status ?? 'aktiv',
    color: body.color ?? null,
  })

  const [created] = await db.select().from(zleProjekte).where(eq(zleProjekte.id, id))
  return NextResponse.json(created, { status: 201 })
}
