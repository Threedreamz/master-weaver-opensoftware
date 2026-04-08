import Link from 'next/link'
import { db } from '@/db'
import { zleZeiteintraege } from '@/db/schema'
import { eq, and, gte, desc } from 'drizzle-orm'

export const dynamic = 'force-dynamic'

export default async function ZeiterfassungPage() {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const eintraege = await db
    .select()
    .from(zleZeiteintraege)
    .where(
      and(
        gte(zleZeiteintraege.startzeit, today),
        eq(zleZeiteintraege.geloescht, false),
      ),
    )
    .orderBy(desc(zleZeiteintraege.startzeit))

  const totalSeconds = eintraege.reduce((sum, e) => sum + (e.dauer ?? 0), 0)
  const totalHours = (totalSeconds / 3600).toFixed(1)

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Zeiterfassung</h1>
          <p className="text-zinc-400 mt-1">
            Heute &mdash;{' '}
            {new Date().toLocaleDateString('de-DE', {
              weekday: 'long',
              day: '2-digit',
              month: 'long',
              year: 'numeric',
            })}
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/zeiterfassung/woche"
            className="rounded-lg border border-zinc-700 px-3 py-1.5 text-sm hover:bg-zinc-800 transition-colors"
          >
            Woche
          </Link>
          <Link
            href="/zeiterfassung/monat"
            className="rounded-lg border border-zinc-700 px-3 py-1.5 text-sm hover:bg-zinc-800 transition-colors"
          >
            Monat
          </Link>
        </div>
      </header>

      {/* Summary */}
      <div className="rounded-lg border border-zinc-800 p-4 mb-6 flex items-center justify-between">
        <span className="text-zinc-400">Gesamt heute</span>
        <span className="text-2xl font-bold">{totalHours}h</span>
      </div>

      {/* Timeline */}
      {eintraege.length === 0 ? (
        <div className="rounded-lg border border-zinc-800 p-12 text-center text-zinc-500">
          Noch keine Eintraege heute.
        </div>
      ) : (
        <div className="space-y-2">
          {eintraege.map((e) => {
            const start = e.startzeit.toLocaleTimeString('de-DE', {
              hour: '2-digit',
              minute: '2-digit',
            })
            const end = e.endzeit
              ? e.endzeit.toLocaleTimeString('de-DE', {
                  hour: '2-digit',
                  minute: '2-digit',
                })
              : 'laeuft...'
            const dauerH = e.dauer ? (e.dauer / 3600).toFixed(1) : '—'

            const typColors: Record<string, string> = {
              arbeitsplatz: 'border-l-blue-500',
              meeting: 'border-l-amber-500',
              manuell: 'border-l-zinc-500',
              pause: 'border-l-red-500',
            }

            return (
              <div
                key={e.id}
                className={`rounded-lg border border-zinc-800 border-l-4 ${typColors[e.typ] ?? 'border-l-zinc-500'} p-4`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm text-zinc-400">{start} — {end}</span>
                    <div className="font-medium mt-0.5">
                      {e.beschreibung ?? e.typ}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">{dauerH}h</div>
                    <div className="text-xs text-zinc-500">{e.quelle}</div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <div className="mt-6 text-center">
        <Link href="/" className="text-sm text-zinc-500 hover:text-zinc-300">
          &larr; Dashboard
        </Link>
      </div>
    </div>
  )
}
