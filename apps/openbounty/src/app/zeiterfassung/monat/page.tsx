import Link from 'next/link'
import { db } from '@/db'
import { zleZeiteintraege } from '@/db/schema'
import { eq, and, gte, lte } from 'drizzle-orm'

export const dynamic = 'force-dynamic'

export default async function MonatsansichtPage() {
  const now = new Date()
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)

  const eintraege = await db
    .select()
    .from(zleZeiteintraege)
    .where(
      and(
        gte(zleZeiteintraege.startzeit, firstDay),
        lte(zleZeiteintraege.startzeit, lastDay),
        eq(zleZeiteintraege.geloescht, false),
      ),
    )

  // Hours per day
  const hoursPerDay: Record<number, number> = {}
  for (const e of eintraege) {
    const day = e.startzeit.getDate()
    hoursPerDay[day] = (hoursPerDay[day] ?? 0) + (e.dauer ?? 0) / 3600
  }

  const daysInMonth = lastDay.getDate()
  const firstDayOfWeek = (firstDay.getDay() + 6) % 7 // Monday = 0

  // Build calendar grid
  const weeks: (number | null)[][] = []
  let currentWeek: (number | null)[] = Array(firstDayOfWeek).fill(null)

  for (let d = 1; d <= daysInMonth; d++) {
    currentWeek.push(d)
    if (currentWeek.length === 7) {
      weeks.push(currentWeek)
      currentWeek = []
    }
  }
  if (currentWeek.length > 0) {
    while (currentWeek.length < 7) currentWeek.push(null)
    weeks.push(currentWeek)
  }

  const maxHours = Math.max(1, ...Object.values(hoursPerDay))
  const monthName = now.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })

  function getHeatColor(hours: number): string {
    if (hours === 0) return 'bg-zinc-900'
    const intensity = hours / maxHours
    if (intensity > 0.75) return 'bg-green-500'
    if (intensity > 0.5) return 'bg-green-600'
    if (intensity > 0.25) return 'bg-green-700'
    return 'bg-green-900'
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Monatsansicht</h1>
          <p className="text-zinc-400 mt-1">{monthName}</p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/zeiterfassung"
            className="rounded-lg border border-zinc-700 px-3 py-1.5 text-sm hover:bg-zinc-800 transition-colors"
          >
            Heute
          </Link>
          <Link
            href="/zeiterfassung/woche"
            className="rounded-lg border border-zinc-700 px-3 py-1.5 text-sm hover:bg-zinc-800 transition-colors"
          >
            Woche
          </Link>
        </div>
      </header>

      {/* Heatmap Calendar */}
      <div className="rounded-lg border border-zinc-800 p-4">
        <div className="grid grid-cols-7 gap-1 mb-2">
          {['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'].map((d) => (
            <div key={d} className="text-center text-xs text-zinc-500 py-1">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {weeks.flat().map((day, i) => {
            if (day === null) {
              return <div key={`empty-${i}`} className="aspect-square" />
            }
            const hours = hoursPerDay[day] ?? 0
            const isToday = day === now.getDate()

            return (
              <div
                key={day}
                className={`aspect-square rounded flex flex-col items-center justify-center ${getHeatColor(hours)} ${isToday ? 'ring-2 ring-blue-500' : ''}`}
                title={`${day}. — ${hours.toFixed(1)}h`}
              >
                <span className="text-xs font-medium">{day}</span>
                {hours > 0 && (
                  <span className="text-[10px] text-zinc-300">{hours.toFixed(1)}h</span>
                )}
              </div>
            )
          })}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-2 mt-4 justify-end">
          <span className="text-xs text-zinc-500">Weniger</span>
          <div className="w-4 h-4 rounded bg-zinc-900" />
          <div className="w-4 h-4 rounded bg-green-900" />
          <div className="w-4 h-4 rounded bg-green-700" />
          <div className="w-4 h-4 rounded bg-green-600" />
          <div className="w-4 h-4 rounded bg-green-500" />
          <span className="text-xs text-zinc-500">Mehr</span>
        </div>
      </div>

      {/* Monthly total */}
      <div className="rounded-lg border border-zinc-800 p-4 mt-4 flex items-center justify-between">
        <span className="text-zinc-400">Gesamt {monthName}</span>
        <span className="text-2xl font-bold">
          {Object.values(hoursPerDay)
            .reduce((s, h) => s + h, 0)
            .toFixed(1)}
          h
        </span>
      </div>

      <div className="mt-6 text-center">
        <Link href="/" className="text-sm text-zinc-500 hover:text-zinc-300">
          &larr; Dashboard
        </Link>
      </div>
    </div>
  )
}
