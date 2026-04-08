import Link from 'next/link'
import { db } from '@/db'
import { zleLeistungen } from '@/db/schema'
import { desc } from 'drizzle-orm'

export const dynamic = 'force-dynamic'

const typIcons: Record<string, { icon: string; color: string }> = {
  commit: { icon: 'GitCommit', color: 'text-green-400' },
  pr: { icon: 'GitPullRequest', color: 'text-purple-400' },
  deployment: { icon: 'Rocket', color: 'text-blue-400' },
  review: { icon: 'Eye', color: 'text-cyan-400' },
  todo_erledigt: { icon: 'CheckCircle', color: 'text-emerald-400' },
  meeting_teilnahme: { icon: 'Users', color: 'text-amber-400' },
  dokumentation: { icon: 'FileText', color: 'text-orange-400' },
  custom: { icon: 'Star', color: 'text-zinc-400' },
}

export default async function LeistungenPage() {
  const leistungen = await db
    .select()
    .from(zleLeistungen)
    .orderBy(desc(zleLeistungen.erfasstAm))
    .limit(100)

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Leistungen</h1>
          <p className="text-zinc-400 mt-1">Aktivitaets-Feed</p>
        </div>
        <Link
          href="/leistungen/nachweis"
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium hover:bg-blue-500 transition-colors"
        >
          Proof of Work
        </Link>
      </header>

      {leistungen.length === 0 ? (
        <div className="rounded-lg border border-zinc-800 p-12 text-center text-zinc-500">
          Noch keine Leistungen erfasst.
        </div>
      ) : (
        <div className="space-y-1">
          {leistungen.map((l) => {
            const typInfo = typIcons[l.typ] ?? typIcons.custom
            const zeit = l.erfasstAm
              ? new Date(l.erfasstAm).toLocaleString('de-DE', {
                  day: '2-digit',
                  month: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit',
                })
              : ''

            return (
              <div
                key={l.id}
                className="flex items-start gap-4 rounded-lg border border-zinc-800 p-4 hover:bg-zinc-900/50 transition-colors"
              >
                <div className={`mt-0.5 text-lg ${typInfo.color}`}>
                  {typInfo.icon === 'GitCommit' && <span>&#9679;</span>}
                  {typInfo.icon === 'GitPullRequest' && <span>&#8644;</span>}
                  {typInfo.icon === 'Rocket' && <span>&#9650;</span>}
                  {typInfo.icon === 'Eye' && <span>&#128065;</span>}
                  {typInfo.icon === 'CheckCircle' && <span>&#10004;</span>}
                  {typInfo.icon === 'Users' && <span>&#9673;</span>}
                  {typInfo.icon === 'FileText' && <span>&#9997;</span>}
                  {typInfo.icon === 'Star' && <span>&#9733;</span>}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium truncate">{l.titel}</span>
                    <span className="shrink-0 rounded-full bg-zinc-800 px-2 py-0.5 text-xs text-zinc-400">
                      {l.typ}
                    </span>
                  </div>
                  {l.beschreibung && (
                    <p className="text-sm text-zinc-500 mt-1 truncate">{l.beschreibung}</p>
                  )}
                  <div className="flex items-center gap-3 text-xs text-zinc-500 mt-1">
                    <span>{zeit}</span>
                    <span>{l.userId}</span>
                    {l.referenz && (
                      <span className="truncate max-w-[200px]">{l.referenz}</span>
                    )}
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
