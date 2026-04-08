'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface Vertrag {
  id: string
  wochenstunden: number
  tagstunden: number
  urlaubstage: number
  gueltigAb: string
  ueberstundenRegelung: string
}

interface Profil {
  id: string
  name: string
  beschreibung: string
  typ: string
}

export default function EinstellungenPage() {
  const [tab, setTab] = useState<'vertrag' | 'profile' | 'arbeitsplatz'>('vertrag')
  const [vertrag, setVertrag] = useState<Vertrag | null>(null)
  const [profile, setProfile] = useState<Profil[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Form state
  const [wochenstunden, setWochenstunden] = useState(40)
  const [tagstunden, setTagstunden] = useState(8)
  const [urlaubstage, setUrlaubstage] = useState(30)
  const [ueberstundenRegelung, setUeberstundenRegelung] = useState('beides')

  useEffect(() => {
    Promise.all([
      fetch('/api/einstellungen/vertrag').then((r) => r.json()),
      fetch('/api/einstellungen/profile').then((r) => r.json()),
    ])
      .then(([v, p]) => {
        setVertrag(v)
        setProfile(p)
        if (v) {
          setWochenstunden(v.wochenstunden)
          setTagstunden(v.tagstunden)
          setUrlaubstage(v.urlaubstage)
          setUeberstundenRegelung(v.ueberstundenRegelung)
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  async function handleSaveVertrag() {
    setSaving(true)
    try {
      const res = await fetch('/api/einstellungen/vertrag', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wochenstunden,
          tagstunden,
          urlaubstage,
          ueberstundenRegelung,
        }),
      })
      const updated = await res.json()
      setVertrag(updated)
    } catch (e) {
      console.error('Fehler beim Speichern:', e)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="mx-auto max-w-4xl px-6 py-8 text-zinc-500">Lade Einstellungen...</div>
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-bold">Einstellungen</h1>
      </header>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-zinc-800">
        {[
          { key: 'vertrag' as const, label: 'Arbeitsvertrag' },
          { key: 'profile' as const, label: 'OpenDesktop-Profile' },
          { key: 'arbeitsplatz' as const, label: 'Neuer Arbeitsplatz' },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm -mb-px border-b-2 transition-colors ${
              tab === t.key
                ? 'border-blue-500 text-white'
                : 'border-transparent text-zinc-500 hover:text-zinc-300'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Arbeitsvertrag Tab */}
      {tab === 'vertrag' && (
        <div className="space-y-4 max-w-lg">
          <div>
            <label className="block text-sm text-zinc-400 mb-1">Wochenstunden</label>
            <input
              type="number"
              value={wochenstunden}
              onChange={(e) => setWochenstunden(Number(e.target.value))}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm text-zinc-400 mb-1">Tagstunden</label>
            <input
              type="number"
              value={tagstunden}
              onChange={(e) => setTagstunden(Number(e.target.value))}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm text-zinc-400 mb-1">Urlaubstage</label>
            <input
              type="number"
              value={urlaubstage}
              onChange={(e) => setUrlaubstage(Number(e.target.value))}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm text-zinc-400 mb-1">Ueberstundenregelung</label>
            <select
              value={ueberstundenRegelung}
              onChange={(e) => setUeberstundenRegelung(e.target.value)}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            >
              <option value="keine">Keine</option>
              <option value="abfeiern">Abfeiern</option>
              <option value="auszahlen">Auszahlen</option>
              <option value="beides">Beides</option>
            </select>
          </div>
          <button
            onClick={handleSaveVertrag}
            disabled={saving}
            className="rounded-lg bg-blue-600 px-6 py-2 text-sm font-medium hover:bg-blue-500 disabled:opacity-50 transition-colors"
          >
            {saving ? 'Speichere...' : 'Speichern'}
          </button>
          {vertrag && (
            <p className="text-xs text-zinc-500">
              Aktueller Vertrag gueltig ab {vertrag.gueltigAb}
            </p>
          )}
        </div>
      )}

      {/* Profile Tab */}
      {tab === 'profile' && (
        <div className="space-y-3">
          <p className="text-sm text-zinc-400 mb-4">
            Verfuegbare OpenDesktop-Profile (nur Lesen)
          </p>
          {profile.map((p) => (
            <div key={p.id} className="rounded-lg border border-zinc-800 p-4">
              <div className="flex items-center gap-2">
                <span className="font-medium">{p.name}</span>
                <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-xs text-zinc-400">
                  {p.typ}
                </span>
              </div>
              <p className="text-sm text-zinc-500 mt-1">{p.beschreibung}</p>
              <p className="text-xs text-zinc-600 mt-1">ID: {p.id}</p>
            </div>
          ))}
        </div>
      )}

      {/* Neuer Arbeitsplatz Tab */}
      {tab === 'arbeitsplatz' && (
        <div className="text-center py-8">
          <p className="text-zinc-400 mb-4">
            Neuen OpenDesktop-Arbeitsplatz einrichten.
          </p>
          <Link
            href="/arbeitsplatz/einrichten"
            className="inline-block rounded-lg bg-blue-600 px-6 py-2 text-sm font-medium hover:bg-blue-500 transition-colors"
          >
            Arbeitsplatz einrichten
          </Link>
        </div>
      )}

      <div className="mt-8 text-center">
        <Link href="/" className="text-sm text-zinc-500 hover:text-zinc-300">
          &larr; Dashboard
        </Link>
      </div>
    </div>
  )
}
