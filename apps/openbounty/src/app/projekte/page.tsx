import Link from 'next/link'
import { db } from '@/db'
import { zleProjekte, zleZeiteintraege, zleAufgaben } from '@/db/schema'
import { eq, and, count, sql } from 'drizzle-orm'

export const dynamic = 'force-dynamic'

export default async function ProjektePage() {
  const projekte = await db.select().from(zleProjekte)

  const projekteWithStats = await Promise.all(
    projekte.map(async (p) => {
      const [zeitResult] = await db
        .select({ total: sql<number>`coalesce(sum(${zleZeiteintraege.dauer}), 0)` })
        .from(zleZeiteintraege)
        .where(and(eq(zleZeiteintraege.projektId, p.id), eq(zleZeiteintraege.geloescht, false)))

      const [todosResult] = await db
        .select({ count: count() })
        .from(zleAufgaben)
        .where(and(eq(zleAufgaben.projektId, p.id), eq(zleAufgaben.status, 'offen')))

      const gesamtStunden = (zeitResult?.total ?? 0) / 3600
      return { ...p, gesamtStunden, offeneTodos: todosResult?.count ?? 0 }
    }),
  )

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Projekte</h1>
          <p className="text-zinc-400 mt-1">{projekte.length} Projekte</p>
        </div>
      </header>

      {projekteWithStats.length === 0 ? (
        <div className="rounded-lg border border-zinc-800 p-12 text-center text-zinc-500">
          Noch keine Projekte angelegt.
        </div>
      ) : (
        <div className="grid gap-3">
          {projekteWithStats.map((p) => {
            const budgetPct =
              p.budgetStunden && p.budgetStunden > 0
                ? Math.min(100, (p.gesamtStunden / p.budgetStunden) * 100)
                : null
            const budgetColor =
              budgetPct !== null && budgetPct > 90
                ? 'bg-red-500'
                : budgetPct !== null && budgetPct > 70
                  ? 'bg-amber-500'
                  : 'bg-blue-500'

            return (
              <Link
                key={p.id}
                href={`/projekte/${p.id}`}
                className="rounded-lg border border-zinc-800 p-4 hover:bg-zinc-900/50 transition-colors"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: p.color ?? '#71717a' }}
                  />
                  <span className="font-medium">{p.name}</span>
                  <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-xs text-zinc-400 capitalize">
                    {p.status}
                  </span>
                </div>

                <div className="flex items-center gap-4 text-sm text-zinc-400">
                  <span>{p.gesamtStunden.toFixed(1)}h</span>
                  {p.budgetStunden && <span>/ {p.budgetStunden}h Budget</span>}
                  {p.kunde && <span>{p.kunde}</span>}
                  <span>{p.offeneTodos} offene TODOs</span>
                </div>

                {budgetPct !== null && (
                  <div className="mt-2 h-1.5 rounded-full bg-zinc-800">
                    <div
                      className={`h-1.5 rounded-full ${budgetColor}`}
                      style={{ width: `${budgetPct}%` }}
                    />
                  </div>
                )}
              </Link>
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
