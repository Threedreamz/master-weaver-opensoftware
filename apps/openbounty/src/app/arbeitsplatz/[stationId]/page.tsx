'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'

interface Arbeitsplatz {
  id: string
  name: string
  standort: string | null
  typ: string
  profilId: string
  maschinenTyp: string | null
  autoLogoutMinuten: number
  dokumentation: DokuItem[] | null
}

interface DokuItem {
  titel: string
  url?: string
  inhalt?: string
  typ: string
}

interface Session {
  id: string
  userId: string
  loginZeit: string
  logoutZeit: string | null
  dauer: number | null
}

interface Todo {
  id: string
  titel: string
  status: string
  prioritaet: string
  quelle: string
}

export default function ArbeitsplatzSessionPage() {
  const params = useParams()
  const stationId = params.stationId as string

  const [arbeitsplatz, setArbeitsplatz] = useState<Arbeitsplatz | null>(null)
  const [aktiveSession, setAktiveSession] = useState<Session | null>(null)
  const [todos, setTodos] = useState<Todo[]>([])
  const [elapsed, setElapsed] = useState(0)
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    try {
      const [apRes, sessionRes, todosRes] = await Promise.all([
        fetch(`/api/arbeitsplaetze/${stationId}`),
        fetch(`/api/arbeitsplaetze/${stationId}/session`),
        fetch(`/api/arbeitsplaetze/${stationId}/todos`),
      ])
      if (apRes.ok) setArbeitsplatz(await apRes.json())
      if (sessionRes.ok) {
        const data = await sessionRes.json()
        setAktiveSession(data.session ?? null)
      }
      if (todosRes.ok) setTodos(await todosRes.json())
    } finally {
      setLoading(false)
    }
  }, [stationId])

  useEffect(() => { fetchData() }, [fetchData])

  // Timer: count elapsed seconds for active session
  useEffect(() => {
    if (!aktiveSession) { setElapsed(0); return }
    const loginTime = new Date(aktiveSession.loginZeit).getTime()
    const tick = () => setElapsed(Math.floor((Date.now() - loginTime) / 1000))
    tick()
    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [aktiveSession])

  const handleLogin = async () => {
    // For now, simple login — in production uses FinderAuth session
    const res = await fetch(`/api/arbeitsplaetze/${stationId}/login`, { method: 'POST' })
    if (res.ok) fetchData()
  }

  const handleLogout = async () => {
    const res = await fetch(`/api/arbeitsplaetze/${stationId}/logout`, { method: 'POST' })
    if (res.ok) fetchData()
  }

  const handleTodoToggle = async (todoId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'erledigt' ? 'offen' : 'erledigt'
    const res = await fetch(`/api/todos/${todoId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    })
    if (res.ok) fetchData()
  }

  const formatDuration = (seconds: number) => {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = seconds % 60
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-zinc-500">Lade Arbeitsplatz...</div>
      </div>
    )
  }

  if (!arbeitsplatz) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-zinc-500 mb-4">Arbeitsplatz nicht gefunden.</p>
          <Link href="/arbeitsplatz" className="text-blue-400 hover:underline">Zurueck</Link>
        </div>
      </div>
    )
  }

  // Kiosk Login Screen — when no active session
  if (!aktiveSession) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-6">
        <div className="w-full max-w-md text-center">
          <div className="mb-2 text-sm text-zinc-500 uppercase tracking-wider">OpenDesktop</div>
          <h1 className="text-3xl font-bold mb-1">{arbeitsplatz.name}</h1>
          <p className="text-zinc-400 mb-2">
            Profil: {arbeitsplatz.profilId}
            {arbeitsplatz.standort && <> &middot; {arbeitsplatz.standort}</>}
          </p>
          {arbeitsplatz.maschinenTyp && (
            <p className="text-sm text-zinc-500 mb-8">Maschine: {arbeitsplatz.maschinenTyp}</p>
          )}

          <button
            onClick={handleLogin}
            className="w-full rounded-xl bg-green-600 py-4 text-lg font-semibold hover:bg-green-500 transition-colors"
          >
            Einloggen
          </button>

          <p className="mt-4 text-xs text-zinc-600">
            Auto-Logout nach {arbeitsplatz.autoLogoutMinuten} Minuten
          </p>
        </div>
      </div>
    )
  }

  // Active Session View — TODOs + Doku + Timer
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header with timer */}
      <header className="sticky top-0 z-10 border-b border-zinc-800 bg-zinc-950/95 backdrop-blur px-6 py-3">
        <div className="flex items-center justify-between max-w-6xl mx-auto">
          <div>
            <span className="font-medium">{arbeitsplatz.name}</span>
            <span className="ml-3 text-sm text-zinc-500">Profil: {arbeitsplatz.profilId}</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
              <span className="font-mono text-lg font-bold text-green-400">
                {formatDuration(elapsed)}
              </span>
            </div>
            <button
              onClick={handleLogout}
              className="rounded-lg bg-red-900/50 border border-red-800 px-4 py-1.5 text-sm text-red-300 hover:bg-red-800/50 transition-colors"
            >
              Ausloggen
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* TODOs */}
          <section>
            <h2 className="text-lg font-semibold mb-3">Meine TODOs</h2>
            {todos.length === 0 ? (
              <div className="rounded-lg border border-zinc-800 p-6 text-center text-zinc-500">
                Keine TODOs vorhanden
              </div>
            ) : (
              <div className="space-y-2">
                {todos.map((todo) => (
                  <button
                    key={todo.id}
                    onClick={() => handleTodoToggle(todo.id, todo.status)}
                    className="w-full text-left rounded-lg border border-zinc-800 px-4 py-3 hover:border-zinc-600 transition-colors flex items-center gap-3"
                  >
                    <div className={`h-5 w-5 rounded border-2 flex items-center justify-center shrink-0 ${
                      todo.status === 'erledigt'
                        ? 'border-green-500 bg-green-500/20 text-green-400'
                        : 'border-zinc-600'
                    }`}>
                      {todo.status === 'erledigt' && <span className="text-xs">&#10003;</span>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className={todo.status === 'erledigt' ? 'line-through text-zinc-500' : ''}>
                        {todo.titel}
                      </span>
                      {todo.quelle !== 'manuell' && (
                        <span className="ml-2 text-xs text-zinc-600">({todo.quelle})</span>
                      )}
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      todo.prioritaet === 'hoch' ? 'bg-red-900/50 text-red-400' :
                      todo.prioritaet === 'mittel' ? 'bg-amber-900/50 text-amber-400' :
                      'bg-zinc-800 text-zinc-500'
                    }`}>
                      {todo.prioritaet}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </section>

          {/* Dokumentation */}
          <section>
            <h2 className="text-lg font-semibold mb-3">Arbeitsplatz-Dokumentation</h2>
            {(!arbeitsplatz.dokumentation || arbeitsplatz.dokumentation.length === 0) ? (
              <div className="rounded-lg border border-zinc-800 p-6 text-center text-zinc-500">
                Keine Dokumentation hinterlegt
              </div>
            ) : (
              <div className="space-y-2">
                {arbeitsplatz.dokumentation.map((dok, i) => (
                  <div
                    key={i}
                    className="rounded-lg border border-zinc-800 px-4 py-3"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 capitalize">
                        {dok.typ}
                      </span>
                      {dok.url ? (
                        <a href={dok.url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
                          {dok.titel}
                        </a>
                      ) : (
                        <span>{dok.titel}</span>
                      )}
                    </div>
                    {dok.inhalt && (
                      <p className="mt-1 text-sm text-zinc-500 line-clamp-2">{dok.inhalt}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  )
}
