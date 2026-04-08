'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'

interface MeetingDetail {
  meeting: {
    id: string
    meetingQuelle: string
    meetingTitel: string | null
    teilnehmerAnzahl: number | null
    hatTranskript: boolean
    hatAufzeichnung: boolean
    zusammenfassungStatus: string
    startzeit: string
    endzeit: string | null
    dauer: number | null
    userId: string
  }
  dokumentation: Array<{
    id: string
    titel: string
    inhalt: string
    typ: string
  }>
  todos: Array<{
    id: string
    aufgabeId: string
    titel: string
    status: string
    prioritaet: string
    transkriptAbschnitt: string | null
    konfidenz: number | null
    bestaetigtVon: string | null
  }>
}

export default function MeetingDetailPage() {
  const params = useParams()
  const id = params.id as string
  const [data, setData] = useState<MeetingDetail | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/meetings/${id}`)
      .then((r) => r.json())
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [id])

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-8 text-zinc-500">Lade Meeting...</div>
    )
  }

  if (!data?.meeting) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-8 text-zinc-500">Meeting nicht gefunden.</div>
    )
  }

  const m = data.meeting
  const dauerMin = m.dauer ? Math.round(m.dauer / 60) : null
  const start = m.startzeit
    ? new Date(m.startzeit).toLocaleString('de-DE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : ''

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <header className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-2xl font-bold">{m.meetingTitel ?? 'Meeting'}</h1>
          <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-xs text-zinc-400">
            {m.meetingQuelle}
          </span>
        </div>
        <div className="flex items-center gap-4 text-sm text-zinc-400">
          <span>{start}</span>
          {dauerMin !== null && <span>{dauerMin} min</span>}
          {m.teilnehmerAnzahl !== null && <span>{m.teilnehmerAnzahl} Teilnehmer</span>}
        </div>
      </header>

      {/* Dokumentation */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold mb-4">Dokumentation</h2>
        {data.dokumentation.length === 0 ? (
          <div className="rounded-lg border border-zinc-800 p-6 text-center text-zinc-500">
            {m.zusammenfassungStatus === 'ausstehend'
              ? 'Zusammenfassung wird generiert...'
              : 'Keine Dokumentation vorhanden.'}
          </div>
        ) : (
          <div className="space-y-3">
            {data.dokumentation.map((doc) => (
              <div key={doc.id} className="rounded-lg border border-zinc-800 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-medium">{doc.titel}</span>
                  <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-xs text-zinc-400">
                    {doc.typ}
                  </span>
                </div>
                <div className="text-sm text-zinc-300 whitespace-pre-wrap">{doc.inhalt}</div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Generated TODOs */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold mb-4">Generierte TODOs</h2>
        {data.todos.length === 0 ? (
          <div className="rounded-lg border border-zinc-800 p-6 text-center text-zinc-500">
            Keine TODOs aus diesem Meeting.
          </div>
        ) : (
          <div className="space-y-2">
            {data.todos.map((todo) => {
              const konfidenzPct = todo.konfidenz ? Math.round(todo.konfidenz * 100) : null
              return (
                <div key={todo.id} className="rounded-lg border border-zinc-800 p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{todo.titel}</span>
                      <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-xs text-zinc-400">
                        {todo.status}
                      </span>
                      <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-xs text-zinc-400">
                        {todo.prioritaet}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {konfidenzPct !== null && (
                        <span className="text-xs text-zinc-500">{konfidenzPct}% Konfidenz</span>
                      )}
                      {todo.bestaetigtVon ? (
                        <span className="text-xs text-green-400">Bestaetigt</span>
                      ) : (
                        <div className="flex gap-1">
                          <button className="rounded bg-green-900/50 px-2 py-1 text-xs text-green-300 hover:bg-green-900">
                            Annehmen
                          </button>
                          <button className="rounded bg-red-900/50 px-2 py-1 text-xs text-red-300 hover:bg-red-900">
                            Ablehnen
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  {todo.transkriptAbschnitt && (
                    <p className="text-sm text-zinc-500 mt-2 italic">
                      &quot;{todo.transkriptAbschnitt}&quot;
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </section>

      <div className="text-center">
        <Link href="/meetings" className="text-sm text-zinc-500 hover:text-zinc-300">
          &larr; Alle Meetings
        </Link>
      </div>
    </div>
  )
}
