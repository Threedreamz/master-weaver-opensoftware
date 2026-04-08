import Link from 'next/link'
import { db } from '@/db'
import { zleProjekte, zleZeiteintraege, zleAufgaben, zleLeistungen } from '@/db/schema'
import { eq, and, count, desc, sql } from 'drizzle-orm'

export const dynamic = 'force-dynamic'

export default async function ProjektDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const [projekt] = await db.select().from(zleProjekte).where(eq(zleProjekte.id, id))
  if (!projekt) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-8 text-zinc-500">
        Projekt nicht gefunden. <Link href="/projekte" className="text-blue-400 hover:underline">Zurueck</Link>
      </div>
    )
  }

  const [zeitResult] = await db
    .select({ total: sql<number>`coalesce(sum(${zleZeiteintraege.dauer}), 0)` })
    .from(zleZeiteintraege)
    .where(and(eq(zleZeiteintraege.projektId, id), eq(zleZeiteintraege.geloescht, false)))

  const gesamtStunden = (zeitResult?.total ?? 0) / 3600

  const recentEntries = await db
    .select()
    .from(zleZeiteintraege)
    .where(and(eq(zleZeiteintraege.projektId, id), eq(zleZeiteintraege.geloescht, false)))
    .orderBy(desc(zleZeiteintraege.startzeit))
    .limit(10)

  const aufgaben = await db
    .select()
    .from(zleAufgaben)
    .where(eq(zleAufgaben.projektId, id))
    .orderBy(desc(zleAufgaben.createdAt))
    .limit(20)

  const leistungen = await db
    .select()
    .from(zleLeistungen)
    .where(eq(zleLeistungen.projektId, id))
    .orderBy(desc(zleLeistungen.erfasstAm))
    .limit(10)

  const budgetPct =
    projekt.budgetStunden && projekt.budgetStunden > 0
      ? Math.min(100, (gesamtStunden / projekt.budgetStunden) * 100)
      : null

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      {/* Header */}
      <header className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div
            className="w-4 h-4 rounded-full shrink-0"
            style={{ backgroundColor: projekt.color ?? '#71717a' }}
          />
          <h1 className="text-2xl font-bold">{projekt.name}</h1>
          <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-xs text-zinc-400 capitalize">
            {projekt.status}
          </span>
        </div>
        {projekt.beschreibung && <p className="text-zinc-400">{projekt.beschreibung}</p>}
        <div className="flex gap-4 text-sm text-zinc-500 mt-2">
          {projekt.kunde && <span>Kunde: {projekt.kunde}</span>}
          {projekt.stundensatz && <span>{projekt.stundensatz} EUR/h</span>}
          {projekt.ecosystemId && <span>Ecosystem: {projekt.ecosystemId}</span>}
        </div>
      </header>

      {/* Budget Section */}
      <div className="rounded-lg border border-zinc-800 p-4 mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-zinc-400">Zeitbudget</span>
          <span className="font-bold">
            {gesamtStunden.toFixed(1)}h{projekt.budgetStunden ? ` / ${projekt.budgetStunden}h` : ''}
          </span>
        </div>
        {budgetPct !== null && (
          <div className="h-2 rounded-full bg-zinc-800">
            <div
              className={`h-2 rounded-full ${budgetPct > 90 ? 'bg-red-500' : budgetPct > 70 ? 'bg-amber-500' : 'bg-blue-500'}`}
              style={{ width: `${budgetPct}%` }}
            />
          </div>
        )}
      </div>

      {/* Time Entries */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold mb-3">Letzte Zeiteintraege</h2>
        {recentEntries.length === 0 ? (
          <p className="text-zinc-500 text-sm">Keine Eintraege.</p>
        ) : (
          <div className="space-y-1">
            {recentEntries.map((e) => (
              <div key={e.id} className="flex items-center justify-between rounded border border-zinc-800 p-3 text-sm">
                <div>
                  <span className="text-zinc-400">
                    {e.startzeit.toLocaleDateString('de-DE')}
                  </span>
                  <span className="ml-2">{e.beschreibung ?? e.typ}</span>
                </div>
                <span className="font-medium">{e.dauer ? (e.dauer / 3600).toFixed(1) + 'h' : '—'}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* TODOs */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold mb-3">TODOs</h2>
        {aufgaben.length === 0 ? (
          <p className="text-zinc-500 text-sm">Keine Aufgaben.</p>
        ) : (
          <div className="space-y-1">
            {aufgaben.map((a) => {
              const statusColors: Record<string, string> = {
                offen: 'text-amber-400',
                in_arbeit: 'text-blue-400',
                erledigt: 'text-green-400',
                abgebrochen: 'text-zinc-500',
              }
              return (
                <div key={a.id} className="flex items-center justify-between rounded border border-zinc-800 p-3 text-sm">
                  <div className="flex items-center gap-2">
                    <span className={statusColors[a.status] ?? 'text-zinc-400'}>&#9679;</span>
                    <span>{a.titel}</span>
                    <span className="text-xs text-zinc-500">{a.prioritaet}</span>
                  </div>
                  <span className="text-xs text-zinc-500 capitalize">{a.status.replace('_', ' ')}</span>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* Leistungen */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold mb-3">Leistungen</h2>
        {leistungen.length === 0 ? (
          <p className="text-zinc-500 text-sm">Keine Leistungen.</p>
        ) : (
          <div className="space-y-1">
            {leistungen.map((l) => (
              <div key={l.id} className="flex items-center justify-between rounded border border-zinc-800 p-3 text-sm">
                <div>
                  <span className="rounded-full bg-zinc-800 px-1.5 py-0.5 text-xs text-zinc-400 mr-2">
                    {l.typ}
                  </span>
                  <span>{l.titel}</span>
                </div>
                <span className="text-xs text-zinc-500">
                  {l.erfasstAm ? new Date(l.erfasstAm).toLocaleDateString('de-DE') : ''}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="text-center">
        <Link href="/projekte" className="text-sm text-zinc-500 hover:text-zinc-300">
          &larr; Alle Projekte
        </Link>
      </div>
    </div>
  )
}
