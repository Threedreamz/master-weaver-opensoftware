'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface Pruefung {
  userId: string
  zeitraum: { von: string; bis: string }
  tage: number
  warnungen: Array<{ datum: string; typ: string; details: string }>
  compliant: boolean
}

interface Warnung {
  id: string
  typ: string
  datum: string
  details: Record<string, unknown>
  bestaetigtVon: string | null
}

interface AuditEntry {
  id: string
  userId: string
  aktion: string
  entitaetTyp: string
  entitaetId: string
  timestamp: string
}

export default function CompliancePage() {
  const [pruefung, setPruefung] = useState<Pruefung | null>(null)
  const [warnungen, setWarnungen] = useState<Warnung[]>([])
  const [auditLog, setAuditLog] = useState<AuditEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch('/api/compliance/pruefung').then((r) => r.json()),
      fetch('/api/compliance/warnungen').then((r) => r.json()),
      fetch('/api/compliance/audit-log?limit=20').then((r) => r.json()),
    ])
      .then(([p, w, a]) => {
        setPruefung(p)
        setWarnungen(w)
        setAuditLog(a.data ?? [])
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-8 text-zinc-500">Lade Compliance-Daten...</div>
    )
  }

  const isCompliant = pruefung?.compliant ?? true

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-bold">Compliance</h1>
        <p className="text-zinc-400 mt-1">ArbZG-Pruefung und Audit-Log</p>
      </header>

      {/* Status Banner */}
      <div
        className={`rounded-lg p-4 mb-6 border ${
          isCompliant
            ? 'border-green-900/50 bg-green-950/30 text-green-300'
            : 'border-red-900/50 bg-red-950/30 text-red-300'
        }`}
      >
        <div className="text-lg font-semibold">
          {isCompliant ? 'Alle Vorgaben eingehalten' : 'Verstoesse erkannt'}
        </div>
        <div className="text-sm mt-1 opacity-80">
          {pruefung
            ? `${pruefung.tage} Tage geprueft (${pruefung.zeitraum.von} — ${pruefung.zeitraum.bis})`
            : 'Keine Pruefung verfuegbar'}
        </div>
      </div>

      {/* This Week's Warnings from Pruefung */}
      {pruefung && pruefung.warnungen.length > 0 && (
        <section className="mb-8">
          <h2 className="text-lg font-semibold mb-4">Aktuelle Warnungen</h2>
          <div className="space-y-2">
            {pruefung.warnungen.map((w, i) => {
              const typColors: Record<string, string> = {
                max_arbeitszeit: 'border-l-red-500',
                fehlende_pause: 'border-l-amber-500',
                sonntagsarbeit: 'border-l-purple-500',
                ruhezeit: 'border-l-orange-500',
              }
              return (
                <div
                  key={i}
                  className={`rounded-lg border border-zinc-800 border-l-4 ${typColors[w.typ] ?? 'border-l-zinc-500'} p-4`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{w.datum}</span>
                    <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-xs text-zinc-400">
                      {w.typ.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <p className="text-sm text-zinc-400 mt-1">{w.details}</p>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* Persisted Warnings */}
      {warnungen.length > 0 && (
        <section className="mb-8">
          <h2 className="text-lg font-semibold mb-4">Gespeicherte Warnungen</h2>
          <div className="space-y-2">
            {warnungen.map((w) => (
              <div key={w.id} className="rounded-lg border border-zinc-800 p-3 flex items-center justify-between">
                <div>
                  <span className="font-medium">{w.datum}</span>
                  <span className="ml-2 text-sm text-zinc-400">{w.typ.replace(/_/g, ' ')}</span>
                </div>
                {w.bestaetigtVon ? (
                  <span className="text-xs text-green-400">Bestaetigt</span>
                ) : (
                  <span className="text-xs text-amber-400">Offen</span>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Audit Log */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold mb-4">Audit-Log</h2>
        {auditLog.length === 0 ? (
          <div className="rounded-lg border border-zinc-800 p-6 text-center text-zinc-500">
            Kein Audit-Log vorhanden.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800 text-zinc-400">
                  <th className="text-left py-2 px-3">Zeitpunkt</th>
                  <th className="text-left py-2 px-3">Benutzer</th>
                  <th className="text-left py-2 px-3">Aktion</th>
                  <th className="text-left py-2 px-3">Typ</th>
                  <th className="text-left py-2 px-3">ID</th>
                </tr>
              </thead>
              <tbody>
                {auditLog.map((entry) => (
                  <tr key={entry.id} className="border-b border-zinc-800/50 hover:bg-zinc-900/50">
                    <td className="py-2 px-3 text-zinc-400">
                      {new Date(entry.timestamp).toLocaleString('de-DE', {
                        day: '2-digit',
                        month: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="py-2 px-3">{entry.userId}</td>
                    <td className="py-2 px-3">{entry.aktion}</td>
                    <td className="py-2 px-3">{entry.entitaetTyp}</td>
                    <td className="py-2 px-3 text-zinc-500 font-mono text-xs">{entry.entitaetId.slice(0, 8)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div className="text-center">
        <Link href="/" className="text-sm text-zinc-500 hover:text-zinc-300">
          &larr; Dashboard
        </Link>
      </div>
    </div>
  )
}
