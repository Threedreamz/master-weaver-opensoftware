'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'

interface DayScore {
  datum: string
  score: number
  arbeitsstunden: number
  meetingStunden: number
  todosErledigt: number
  commitsAnzahl: number
  leistungenAnzahl: number
  details: {
    todoScore: number
    gitScore: number
    meetingScore: number
    dokuScore: number
    praesenzScore: number
  }
}

export default function NachweisPage() {
  const [today, setToday] = useState<DayScore | null>(null)
  const [week, setWeek] = useState<DayScore[]>([])
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    try {
      const [heuteRes, wocheRes] = await Promise.all([
        fetch('/api/proof-of-work/heute'),
        fetch('/api/proof-of-work/woche'),
      ])
      setToday(await heuteRes.json())
      setWeek(await wocheRes.json())
    } catch (e) {
      console.error('PoW fetch error:', e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 30000)
    return () => clearInterval(interval)
  }, [fetchData])

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-8">
        <div className="animate-pulse text-zinc-500">Lade Proof of Work...</div>
      </div>
    )
  }

  const score = today?.score ?? 0
  const gaugeColor =
    score >= 80 ? 'text-green-400' : score >= 50 ? 'text-amber-400' : 'text-red-400'

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <header className="mb-8">
        <h1 className="text-2xl font-bold">Proof of Work</h1>
        <p className="text-zinc-400 mt-1">Tagesleistung und Wochenverlauf</p>
      </header>

      {/* Score Gauge */}
      <div className="flex items-center justify-center mb-8">
        <div className="relative w-48 h-48 flex items-center justify-center rounded-full border-4 border-zinc-800">
          <div className="text-center">
            <div className={`text-5xl font-bold ${gaugeColor}`}>{score}</div>
            <div className="text-sm text-zinc-500 mt-1">von 100</div>
          </div>
        </div>
      </div>

      {/* Today Stats */}
      {today && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          <MiniStat label="Stunden" value={`${today.arbeitsstunden}h`} />
          <MiniStat label="Meetings" value={`${today.meetingStunden}h`} />
          <MiniStat label="TODOs" value={String(today.todosErledigt)} />
          <MiniStat label="Commits" value={String(today.commitsAnzahl)} />
        </div>
      )}

      {/* Category Breakdown */}
      {today?.details && (
        <section className="mb-8">
          <h2 className="text-lg font-semibold mb-4">Kategorien</h2>
          <div className="space-y-3">
            <CategoryBar label="TODOs (30%)" value={today.details.todoScore} />
            <CategoryBar label="Git (25%)" value={today.details.gitScore} />
            <CategoryBar label="Meeting (15%)" value={today.details.meetingScore} />
            <CategoryBar label="Dokumentation (15%)" value={today.details.dokuScore} />
            <CategoryBar label="Praesenz (15%)" value={today.details.praesenzScore} />
          </div>
        </section>
      )}

      {/* Weekly Chart */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold mb-4">Wochenverlauf</h2>
        <div className="flex items-end gap-2 h-32">
          {week.map((d) => {
            const height = Math.max(4, (d.score / 100) * 100)
            const dayName = new Date(d.datum).toLocaleDateString('de-DE', { weekday: 'short' })
            const barColor =
              d.score >= 80
                ? 'bg-green-500'
                : d.score >= 50
                  ? 'bg-amber-500'
                  : d.score > 0
                    ? 'bg-red-500'
                    : 'bg-zinc-800'

            return (
              <div key={d.datum} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-xs text-zinc-500">{d.score}</span>
                <div
                  className={`w-full rounded-t ${barColor}`}
                  style={{ height: `${height}%` }}
                />
                <span className="text-xs text-zinc-500">{dayName}</span>
              </div>
            )
          })}
        </div>
      </section>

      <div className="text-center">
        <Link href="/leistungen" className="text-sm text-zinc-500 hover:text-zinc-300">
          &larr; Leistungen
        </Link>
      </div>
    </div>
  )
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-zinc-800 p-3 text-center">
      <div className="text-xl font-bold">{value}</div>
      <div className="text-xs text-zinc-500">{label}</div>
    </div>
  )
}

function CategoryBar({ label, value }: { label: string; value: number }) {
  const color =
    value >= 80 ? 'bg-green-500' : value >= 50 ? 'bg-amber-500' : value > 0 ? 'bg-red-500' : 'bg-zinc-700'
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-zinc-400">{label}</span>
        <span>{Math.round(value)}%</span>
      </div>
      <div className="h-2 rounded-full bg-zinc-800">
        <div className={`h-2 rounded-full ${color}`} style={{ width: `${Math.min(100, value)}%` }} />
      </div>
    </div>
  )
}
