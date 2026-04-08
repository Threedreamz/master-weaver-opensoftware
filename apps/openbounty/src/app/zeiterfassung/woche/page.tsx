import Link from 'next/link'
import { db } from '@/db'
import { zleZeiteintraege, zleProjekte } from '@/db/schema'
import { eq, and, gte, lte } from 'drizzle-orm'

export const dynamic = 'force-dynamic'

export default async function WochenansichtPage() {
  // Calculate Monday of current week
  const now = new Date()
  const dayOfWeek = now.getDay()
  const monday = new Date(now)
  monday.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1))
  monday.setHours(0, 0, 0, 0)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  sunday.setHours(23, 59, 59, 999)

  const eintraege = await db
    .select()
    .from(zleZeiteintraege)
    .where(
      and(
        gte(zleZeiteintraege.startzeit, monday),
        lte(zleZeiteintraege.startzeit, sunday),
        eq(zleZeiteintraege.geloescht, false),
      ),
    )

  const projekte = await db.select().from(zleProjekte)
  const projektMap = new Map(projekte.map((p) => [p.id, p]))

  // Build grid: projekt x day
  const dayNames = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']
  const grid: Record<string, number[]> = {}

  for (const e of eintraege) {
    const projektName = e.projektId ? (projektMap.get(e.projektId)?.name ?? 'Unbekannt') : 'Ohne Projekt'
    if (!grid[projektName]) grid[projektName] = [0, 0, 0, 0, 0, 0, 0]
    const dayIndex = (e.startzeit.getDay() + 6) % 7 // Monday = 0
    grid[projektName][dayIndex] += (e.dauer ?? 0) / 3600
  }

  // Day totals
  const dayTotals = [0, 0, 0, 0, 0, 0, 0]
  for (const hours of Object.values(grid)) {
    hours.forEach((h, i) => {
      dayTotals[i] += h
    })
  }

  // Day dates
  const dayDates = dayNames.map((_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })
  })

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Wochenansicht</h1>
          <p className="text-zinc-400 mt-1">
            {monday.toLocaleDateString('de-DE')} — {sunday.toLocaleDateString('de-DE')}
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/zeiterfassung"
            className="rounded-lg border border-zinc-700 px-3 py-1.5 text-sm hover:bg-zinc-800 transition-colors"
          >
            Heute
          </Link>
          <Link
            href="/zeiterfassung/monat"
            className="rounded-lg border border-zinc-700 px-3 py-1.5 text-sm hover:bg-zinc-800 transition-colors"
          >
            Monat
          </Link>
        </div>
      </header>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800">
              <th className="text-left py-2 px-3 text-zinc-400 font-medium">Projekt</th>
              {dayNames.map((d, i) => (
                <th key={d} className="text-center py-2 px-3 text-zinc-400 font-medium min-w-[80px]">
                  <div>{d}</div>
                  <div className="text-xs font-normal">{dayDates[i]}</div>
                </th>
              ))}
              <th className="text-right py-2 px-3 text-zinc-400 font-medium">Gesamt</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(grid).map(([projekt, hours]) => {
              const total = hours.reduce((s, h) => s + h, 0)
              return (
                <tr key={projekt} className="border-b border-zinc-800/50 hover:bg-zinc-900/50">
                  <td className="py-2 px-3 font-medium">{projekt}</td>
                  {hours.map((h, i) => (
                    <td key={i} className="text-center py-2 px-3">
                      {h > 0 ? (
                        <span className="rounded bg-blue-900/30 px-2 py-0.5 text-blue-300">
                          {h.toFixed(1)}
                        </span>
                      ) : (
                        <span className="text-zinc-700">—</span>
                      )}
                    </td>
                  ))}
                  <td className="text-right py-2 px-3 font-medium">{total.toFixed(1)}h</td>
                </tr>
              )
            })}
            {Object.keys(grid).length === 0 && (
              <tr>
                <td colSpan={9} className="py-8 text-center text-zinc-500">
                  Keine Eintraege diese Woche.
                </td>
              </tr>
            )}
          </tbody>
          <tfoot>
            <tr className="border-t border-zinc-700">
              <td className="py-2 px-3 font-semibold">Gesamt</td>
              {dayTotals.map((t, i) => (
                <td key={i} className="text-center py-2 px-3 font-semibold">
                  {t > 0 ? `${t.toFixed(1)}` : '—'}
                </td>
              ))}
              <td className="text-right py-2 px-3 font-bold">
                {dayTotals.reduce((s, t) => s + t, 0).toFixed(1)}h
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="mt-6 text-center">
        <Link href="/" className="text-sm text-zinc-500 hover:text-zinc-300">
          &larr; Dashboard
        </Link>
      </div>
    </div>
  )
}
