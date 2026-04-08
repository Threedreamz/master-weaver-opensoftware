import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { zleZeiteintraege, zlePausen } from '@/db/schema'
import { eq, and, gte, lte } from 'drizzle-orm'

interface Warnung {
  datum: string
  typ: string
  details: string
}

/** GET /api/compliance/pruefung — ArbZG-Pruefung fuer Zeitraum */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams
  const userId = sp.get('userId') ?? 'dev-user-1'
  const von = sp.get('von') ?? new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10)
  const bis = sp.get('bis') ?? new Date().toISOString().slice(0, 10)

  const startDate = new Date(von + 'T00:00:00')
  const endDate = new Date(bis + 'T23:59:59')

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

  const warnungen: Warnung[] = []

  // Group by day
  const byDay: Record<string, typeof eintraege> = {}
  for (const e of eintraege) {
    const day = e.startzeit.toISOString().slice(0, 10)
    if (!byDay[day]) byDay[day] = []
    byDay[day].push(e)
  }

  const days = Object.keys(byDay).sort()
  for (let i = 0; i < days.length; i++) {
    const day = days[i]
    const entries = byDay[day]
    const totalSeconds = entries.reduce((sum, e) => sum + (e.dauer ?? 0), 0)
    const totalHours = totalSeconds / 3600

    // §3 ArbZG: Max 10 Stunden pro Tag
    if (totalHours > 10) {
      warnungen.push({
        datum: day,
        typ: 'max_arbeitszeit',
        details: `${totalHours.toFixed(1)}h gearbeitet (max. 10h, §3 ArbZG)`,
      })
    }

    // §4 ArbZG: Pausen — 30min ab 6h, 45min ab 9h
    if (totalHours > 6) {
      const pauseEntries = entries.filter((e) => e.typ === 'pause')
      const pauseSeconds = pauseEntries.reduce((sum, e) => sum + (e.dauer ?? 0), 0)
      const pauseMinutes = pauseSeconds / 60

      if (totalHours > 9 && pauseMinutes < 45) {
        warnungen.push({
          datum: day,
          typ: 'fehlende_pause',
          details: `Nur ${pauseMinutes.toFixed(0)}min Pause bei ${totalHours.toFixed(1)}h (min. 45min, §4 ArbZG)`,
        })
      } else if (totalHours > 6 && pauseMinutes < 30) {
        warnungen.push({
          datum: day,
          typ: 'fehlende_pause',
          details: `Nur ${pauseMinutes.toFixed(0)}min Pause bei ${totalHours.toFixed(1)}h (min. 30min, §4 ArbZG)`,
        })
      }
    }

    // §5 ArbZG: 11h Ruhezeit zwischen Arbeitstagen
    if (i > 0) {
      const prevDay = days[i - 1]
      const prevEntries = byDay[prevDay]
      const lastEndPrev = Math.max(
        ...prevEntries.map((e) => (e.endzeit?.getTime() ?? e.startzeit.getTime() + (e.dauer ?? 0) * 1000)),
      )
      const firstStartToday = Math.min(...entries.map((e) => e.startzeit.getTime()))
      const ruhezeitStunden = (firstStartToday - lastEndPrev) / 3600000

      if (ruhezeitStunden < 11) {
        warnungen.push({
          datum: day,
          typ: 'ruhezeit',
          details: `Nur ${ruhezeitStunden.toFixed(1)}h Ruhezeit (min. 11h, §5 ArbZG)`,
        })
      }
    }

    // §9/§10 ArbZG: Sonntags-/Feiertagsarbeit
    const dayDate = new Date(day)
    if (dayDate.getDay() === 0) {
      warnungen.push({
        datum: day,
        typ: 'sonntagsarbeit',
        details: `Sonntagsarbeit erkannt (§9 ArbZG)`,
      })
    }
  }

  return NextResponse.json({
    userId,
    zeitraum: { von, bis },
    tage: days.length,
    warnungen,
    compliant: warnungen.length === 0,
  })
}
