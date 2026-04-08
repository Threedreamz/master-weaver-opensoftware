import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { zleArbeitsplaetze } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { newId } from '@/lib/ids'

/** POST /api/opendesktop/arbeitsplaetze — Register a new Arbeitsplatz from OpenDesktop */
export async function POST(req: NextRequest) {
  const body = await req.json()
  const { name, standort, typ, profilId, ecosystemId, maschinenTyp, konfiguration, dokumentation, autoLogoutMinuten } = body

  if (!name || !typ || !profilId) {
    return NextResponse.json({ error: 'name, typ, and profilId are required' }, { status: 400 })
  }

  const id = newId()
  await db.insert(zleArbeitsplaetze).values({
    id,
    name,
    standort: standort || null,
    typ,
    profilId,
    ecosystemId: ecosystemId || null,
    maschinenTyp: maschinenTyp || null,
    konfiguration: konfiguration || null,
    dokumentation: dokumentation || null,
    autoLogoutMinuten: autoLogoutMinuten || 480,
    aktiv: true,
  })

  return NextResponse.json({ id, name, profilId }, { status: 201 })
}

/** PUT /api/opendesktop/arbeitsplaetze?id=... — Update Arbeitsplatz config */
export async function PUT(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id query param required' }, { status: 400 })

  const body = await req.json()
  const { name, standort, konfiguration, dokumentation, autoLogoutMinuten, aktiv } = body

  const updates: Record<string, unknown> = { updatedAt: new Date() }
  if (name !== undefined) updates.name = name
  if (standort !== undefined) updates.standort = standort
  if (konfiguration !== undefined) updates.konfiguration = konfiguration
  if (dokumentation !== undefined) updates.dokumentation = dokumentation
  if (autoLogoutMinuten !== undefined) updates.autoLogoutMinuten = autoLogoutMinuten
  if (aktiv !== undefined) updates.aktiv = aktiv

  await db.update(zleArbeitsplaetze).set(updates).where(eq(zleArbeitsplaetze.id, id))

  return NextResponse.json({ success: true, id })
}
