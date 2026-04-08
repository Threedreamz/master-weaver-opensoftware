import Link from 'next/link'
import { db } from '@/db'
import { zleArbeitsplaetze } from '@/db/schema'
import { eq } from 'drizzle-orm'

export const dynamic = 'force-dynamic'

export default async function ArbeitsplatzUebersicht() {
  const arbeitsplaetze = await db
    .select()
    .from(zleArbeitsplaetze)
    .where(eq(zleArbeitsplaetze.aktiv, true))

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <header className="mb-8">
        <Link href="/" className="text-sm text-zinc-500 hover:text-zinc-300">&larr; Dashboard</Link>
        <h1 className="text-2xl font-bold mt-2">OpenDesktop-Arbeitsplaetze</h1>
        <p className="text-zinc-400 mt-1">Waehle einen Arbeitsplatz zum Einloggen</p>
      </header>

      {arbeitsplaetze.length === 0 ? (
        <div className="rounded-lg border border-zinc-800 p-12 text-center">
          <p className="text-zinc-500 mb-4">Noch keine Arbeitsplaetze eingerichtet.</p>
          <Link
            href="/arbeitsplatz/einrichten"
            className="inline-block rounded-lg bg-blue-600 px-6 py-2 text-sm font-medium hover:bg-blue-500"
          >
            Ersten Arbeitsplatz einrichten
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {arbeitsplaetze.map((ap) => (
            <Link
              key={ap.id}
              href={`/arbeitsplatz/${ap.id}`}
              className="group rounded-xl border border-zinc-800 p-6 hover:border-blue-600 hover:bg-zinc-900/50 transition-all"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-semibold group-hover:text-blue-400 transition-colors">
                    {ap.name}
                  </h3>
                  <p className="text-sm text-zinc-500 mt-1">
                    {ap.standort && <>{ap.standort} &middot; </>}
                    <span className="capitalize">{ap.typ}</span>
                    {ap.maschinenTyp && <> &middot; {ap.maschinenTyp}</>}
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-zinc-800 px-3 py-1 text-xs text-zinc-400">
                  {ap.profilId}
                </span>
              </div>
              <div className="mt-4 text-xs text-zinc-600">
                Auto-Logout nach {ap.autoLogoutMinuten} min
              </div>
            </Link>
          ))}
        </div>
      )}

      <div className="mt-8 text-center">
        <Link
          href="/arbeitsplatz/einrichten"
          className="text-sm text-zinc-500 hover:text-white transition-colors"
        >
          + Neuen Arbeitsplatz einrichten
        </Link>
      </div>
    </div>
  )
}
