import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { zleZeiteintraege, zleLeistungen, zleAufgaben, zleProjekte } from '@/db/schema'
import { eq, and, gte, lte, count, sql } from 'drizzle-orm'

/** GET /api/berichte/mitarbeiter/[id] — Mitarbeiter-Bericht */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: userId } = await params
  const sp = req.nextUrl.searchParams
  const von = sp.get('von') ?? new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10)
  const bis = sp.get('bis') ?? new Date().toISOString().slice(0, 10)

  const startDate = new Date(von + 'T00:00:00')
  const endDate = new Date(bis + 'T23:59:59')

  // Zeiteintraege
  const eintraege = await db
    .select()
    .from(zleZeiteintraege)
    .where(
      and(
        eq(zleZeiteintraege.userId, userId),
        gte(zleZeiteintraege.startzeit, startDate),
        lte(zleZeiteintraege.startzeit, endDate),
        eq(zleZeiteintraege.geloescht, false),
      ),
    )

  const totalSeconds = eintraege.reduce((sum, e) => sum + (e.dauer ?? 0), 0)
  const meetingSeconds = eintraege.filter((e) => e.typ === 'meeting').reduce((sum, e) => sum + (e.dauer ?? 0), 0)

  // Projekt-Aufschluesselung
  const byProjekt: Record<string, { stunden: number; eintraege: number }> = {}
  for (const e of eintraege) {
    const pid = e.projektId ?? '__ohne_projekt__'
    if (!byProjekt[pid]) byProjekt[pid] = { stunden: 0, eintraege: 0 }
    byProjekt[pid].stunden += (e.dauer ?? 0) / 3600
    byProjekt[pid].eintraege++
  }

  // TODOs
  const [todosResult] = await db
    .select({ count: count() })
    .from(zleAufgaben)
    .where(
      and(
        eq(zleAufgaben.userId, userId),
        eq(zleAufgaben.status, 'erledigt'),
        gte(zleAufgaben.erledigtAm, startDate),
        lte(zleAufgaben.erledigtAm, endDate),
      ),
    )

  // Leistungen
  const [leistungenResult] = await db
    .select({ count: count() })
    .from(zleLeistungen)
    .where(
      and(
        eq(zleLeistungen.userId, userId),
        gte(zleLeistungen.erfasstAm, startDate),
        lte(zleLeistungen.erfasstAm, endDate),
      ),
    )

  return NextResponse.json({
    userId,
    zeitraum: { von, bis },
    gesamtStunden: Math.round((totalSeconds / 3600) * 100) / 100,
    meetingStunden: Math.round((meetingSeconds / 3600) * 100) / 100,
    projekte: Object.entries(byProjekt).map(([id, data]) => ({
      projektId: id === '__ohne_projekt__' ? null : id,
      stunden: Math.round(data.stunden * 100) / 100,
      eintraege: data.eintraege,
    })),
    todosErledigt: todosResult?.count ?? 0,
    leistungen: leistungenResult?.count ?? 0,
  })
}
