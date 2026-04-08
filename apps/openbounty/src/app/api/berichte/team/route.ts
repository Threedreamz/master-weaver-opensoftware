import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { zleZeiteintraege, zleAufgaben, zleLeistungen } from '@/db/schema'
import { and, gte, lte, eq, sql } from 'drizzle-orm'

/** GET /api/berichte/team — Team-Uebersicht */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams
  const von = sp.get('von') ?? new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10)
  const bis = sp.get('bis') ?? new Date().toISOString().slice(0, 10)

  const startDate = new Date(von + 'T00:00:00')
  const endDate = new Date(bis + 'T23:59:59')

  const eintraege = await db
    .select()
    .from(zleZeiteintraege)
    .where(
      and(
        gte(zleZeiteintraege.startzeit, startDate),
        lte(zleZeiteintraege.startzeit, endDate),
        eq(zleZeiteintraege.geloescht, false),
      ),
    )

  // Group by user
  const byUser: Record<string, { stunden: number; meetings: number; eintraege: number }> = {}
  for (const e of eintraege) {
    if (!byUser[e.userId]) byUser[e.userId] = { stunden: 0, meetings: 0, eintraege: 0 }
    byUser[e.userId].stunden += (e.dauer ?? 0) / 3600
    if (e.typ === 'meeting') byUser[e.userId].meetings += (e.dauer ?? 0) / 3600
    byUser[e.userId].eintraege++
  }

  const mitglieder = Object.entries(byUser).map(([userId, data]) => ({
    userId,
    stunden: Math.round(data.stunden * 100) / 100,
    meetingStunden: Math.round(data.meetings * 100) / 100,
    eintraege: data.eintraege,
  }))

  return NextResponse.json({
    zeitraum: { von, bis },
    mitglieder,
    gesamt: {
      stunden: Math.round(mitglieder.reduce((s, m) => s + m.stunden, 0) * 100) / 100,
      mitarbeiter: mitglieder.length,
    },
  })
}
