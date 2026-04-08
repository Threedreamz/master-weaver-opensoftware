'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface Profil {
  id: string
  name: string
  beschreibung: string
  typ: string
}

export default function ArbeitsplatzEinrichtenPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<Profil[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [name, setName] = useState('')
  const [standort, setStandort] = useState('')
  const [typ, setTyp] = useState<'maschine' | 'desktop' | 'remote' | 'mobil'>('desktop')
  const [profilId, setProfilId] = useState('')
  const [maschinenTyp, setMaschinenTyp] = useState('')
  const [autoLogoutMinuten, setAutoLogoutMinuten] = useState(480)

  useEffect(() => {
    fetch('/api/einstellungen/profile')
      .then((r) => r.json())
      .then((data) => {
        setProfile(data)
        if (data.length > 0) setProfilId(data[0].id)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) {
      setError('Name ist erforderlich')
      return
    }
    setSaving(true)
    setError(null)

    try {
      const res = await fetch('/api/arbeitsplaetze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          standort: standort.trim() || null,
          typ,
          profilId,
          maschinenTyp: maschinenTyp.trim() || null,
          autoLogoutMinuten,
          konfiguration: {
            widgets: ['zeiterfassung', 'todos', 'leistungen'],
            todoKategorien: ['allgemein'],
            eventQuellen: [],
          },
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? 'Fehler beim Erstellen')
        return
      }

      const created = await res.json()
      router.push(`/arbeitsplatz/${created.id}`)
    } catch (err) {
      setError('Netzwerkfehler')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="mx-auto max-w-2xl px-6 py-8 text-zinc-500">Lade Profile...</div>
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-8">
      <header className="mb-8">
        <h1 className="text-2xl font-bold">Neuen Arbeitsplatz einrichten</h1>
        <p className="text-zinc-400 mt-1">OpenDesktop-Arbeitsplatz registrieren</p>
      </header>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm text-zinc-400 mb-1">
            Name <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="z.B. WinWerth CT-Scanner"
            className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-sm text-zinc-400 mb-1">Standort</label>
          <input
            type="text"
            value={standort}
            onChange={(e) => setStandort(e.target.value)}
            placeholder="z.B. Halle 2, Remote"
            className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-sm text-zinc-400 mb-1">Typ</label>
          <select
            value={typ}
            onChange={(e) => setTyp(e.target.value as typeof typ)}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          >
            <option value="maschine">Maschine</option>
            <option value="desktop">Desktop</option>
            <option value="remote">Remote</option>
            <option value="mobil">Mobil</option>
          </select>
        </div>

        <div>
          <label className="block text-sm text-zinc-400 mb-1">OpenDesktop-Profil</label>
          <select
            value={profilId}
            onChange={(e) => setProfilId(e.target.value)}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          >
            {profile.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.typ})
              </option>
            ))}
          </select>
          {profile.find((p) => p.id === profilId)?.beschreibung && (
            <p className="text-xs text-zinc-500 mt-1">
              {profile.find((p) => p.id === profilId)?.beschreibung}
            </p>
          )}
        </div>

        {typ === 'maschine' && (
          <div>
            <label className="block text-sm text-zinc-400 mb-1">Maschinentyp</label>
            <input
              type="text"
              value={maschinenTyp}
              onChange={(e) => setMaschinenTyp(e.target.value)}
              placeholder="z.B. ct-scanner, fdm-drucker"
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>
        )}

        <div>
          <label className="block text-sm text-zinc-400 mb-1">
            Auto-Logout nach (Minuten)
          </label>
          <input
            type="number"
            value={autoLogoutMinuten}
            onChange={(e) => setAutoLogoutMinuten(Number(e.target.value))}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
          <p className="text-xs text-zinc-500 mt-1">{(autoLogoutMinuten / 60).toFixed(1)} Stunden</p>
        </div>

        {error && (
          <div className="rounded-lg border border-red-900/50 bg-red-950/30 p-3 text-sm text-red-300">
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-blue-600 px-6 py-2 text-sm font-medium hover:bg-blue-500 disabled:opacity-50 transition-colors"
          >
            {saving ? 'Erstelle...' : 'Arbeitsplatz erstellen'}
          </button>
          <Link
            href="/einstellungen"
            className="rounded-lg border border-zinc-700 px-6 py-2 text-sm hover:bg-zinc-800 transition-colors"
          >
            Abbrechen
          </Link>
        </div>
      </form>
    </div>
  )
}
