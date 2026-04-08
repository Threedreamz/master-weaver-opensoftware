import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { zleZeiteintraege } from '@/db/schema'
import { eq, and, gte, lte } from 'drizzle-orm'

/** GET /api/zeiteintraege/zusammenfassung — Aggregierte Stunden pro Tag/Woche/Monat */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams
  const userId = sp.get('userId') ?? 'dev-user-1'
  const gruppierung = sp.get('gruppierung') ?? 'tag' // tag | woche | monat
  const von = sp.get('von') ?? new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10)
  const bis = sp.get('bis') ?? new Date().toISOString().slice(0, 10)

  const eintraege = await db
    .select()
    .from(zleZeiteintraege)
    .where(
      and(
        eq(zleZeiteintraege.userId, userId),
        gte(zleZeiteintraege.startzeit, new Date(von + 'T00:00:00')),
        lte(zleZeiteintraege.startzeit, new Date(bis + 'T23:59:59')),
        eq(zleZeiteintraege.geloescht, false),
      ),
    )

  const grouped: Record<string, { stunden: number; eintraege: number }> = {}

  for (const e of eintraege) {
    let key: string
    const d = e.startzeit

    if (gruppierung === 'monat') {
      key = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`
    } else if (gruppierung === 'woche') {
      // ISO week start (Monday)
      const mon = new Date(d)
      const day = mon.getDay()
      const diff = day === 0 ? -6 : 1 - day
      mon.setDate(mon.getDate() + diff)
      key = mon.toISOString().slice(0, 10)
    } else {
      key = d.toISOString().slice(0, 10)
    }

    if (!grouped[key]) grouped[key] = { stunden: 0, eintraege: 0 }
    grouped[key].stunden += (e.dauer ?? 0) / 3600
    grouped[key].eintraege++
  }

  const result = Object.entries(grouped)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, data]) => ({
      periode: key,
      stunden: Math.round(data.stunden * 100) / 100,
      eintraege: data.eintraege,
    }))

  return NextResponse.json({ userId, gruppierung, zeitraum: { von, bis }, daten: result })
}
