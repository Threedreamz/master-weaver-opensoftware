import Link from 'next/link'
import { db } from '@/db'
import { zleArbeitsplaetze, zleArbeitsplatzSessions, zleZeiteintraege, zleAufgaben } from '@/db/schema'
import { eq, isNull, and, gte, count, sum } from 'drizzle-orm'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const [aktiveSessionsResult] = await db
    .select({ count: count() })
    .from(zleArbeitsplatzSessions)
    .where(isNull(zleArbeitsplatzSessions.logoutZeit))

  const [heuteEintraegeResult] = await db
    .select({ count: count() })
    .from(zleZeiteintraege)
    .where(gte(zleZeiteintraege.startzeit, today))

  const [offeneTodosResult] = await db
    .select({ count: count() })
    .from(zleAufgaben)
    .where(eq(zleAufgaben.status, 'offen'))

  const arbeitsplaetze = await db.select().from(zleArbeitsplaetze).where(eq(zleArbeitsplaetze.aktiv, true))

  const aktiveSessions = aktiveSessionsResult?.count ?? 0
  const heuteEintraege = heuteEintraegeResult?.count ?? 0
  const offeneTodos = offeneTodosResult?.count ?? 0

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold">OpenBounty</h1>
        <p className="text-zinc-400 mt-1">Zeit, Leistung & Bounties</p>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <StatCard label="Aktive Sessions" value={aktiveSessions} color="green" />
        <StatCard label="Eintraege heute" value={heuteEintraege} color="blue" />
        <StatCard label="Offene TODOs" value={offeneTodos} color="amber" />
      </div>

      {/* Arbeitsplaetze */}
      <section className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">OpenDesktop-Arbeitsplaetze</h2>
          <Link
            href="/arbeitsplatz"
            className="text-sm text-zinc-400 hover:text-white transition-colors"
          >
            Alle anzeigen &rarr;
          </Link>
        </div>
        {arbeitsplaetze.length === 0 ? (
          <div className="rounded-lg border border-zinc-800 p-8 text-center text-zinc-500">
            Noch keine Arbeitsplaetze eingerichtet.{' '}
            <Link href="/einstellungen" className="text-blue-400 hover:underline">
              Jetzt einrichten
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {arbeitsplaetze.map((ap) => (
              <Link
                key={ap.id}
                href={`/arbeitsplatz/${ap.id}`}
                className="rounded-lg border border-zinc-800 p-4 hover:border-zinc-600 transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">{ap.name}</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400">
                    {ap.profilId}
                  </span>
                </div>
                <div className="text-sm text-zinc-500">
                  {ap.standort && <span>{ap.standort} &middot; </span>}
                  <span className="capitalize">{ap.typ}</span>
                  {ap.maschinenTyp && <span> &middot; {ap.maschinenTyp}</span>}
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Quick Links */}
      <section>
        <h2 className="text-xl font-semibold mb-4">Schnellzugriff</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <QuickLink href="/zeiterfassung" label="Zeiterfassung" />
          <QuickLink href="/leistungen" label="Leistungen" />
          <QuickLink href="/meetings" label="Meetings" />
          <QuickLink href="/berichte" label="Berichte" />
          <QuickLink href="/projekte" label="Projekte" />
          <QuickLink href="/compliance" label="Compliance" />
          <QuickLink href="/leistungen/nachweis" label="Proof of Work" />
          <QuickLink href="/einstellungen" label="Einstellungen" />
        </div>
      </section>
    </div>
  )
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  const colorClasses: Record<string, string> = {
    green: 'border-green-900/50 bg-green-950/30',
    blue: 'border-blue-900/50 bg-blue-950/30',
    amber: 'border-amber-900/50 bg-amber-950/30',
  }
  return (
    <div className={`rounded-lg border p-4 ${colorClasses[color] ?? 'border-zinc-800'}`}>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-sm text-zinc-400">{label}</div>
    </div>
  )
}

function QuickLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="rounded-lg border border-zinc-800 px-4 py-3 text-sm text-center hover:border-zinc-600 hover:bg-zinc-900 transition-colors"
    >
      {label}
    </Link>
  )
}
