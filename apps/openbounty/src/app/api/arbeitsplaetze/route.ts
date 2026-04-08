import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { zleArbeitsplaetze } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { newId } from '@/lib/ids'

/** GET /api/arbeitsplaetze — Alle aktiven Arbeitsplaetze */
export async function GET() {
  const result = await db
    .select()
    .from(zleArbeitsplaetze)
    .where(eq(zleArbeitsplaetze.aktiv, true))
  return NextResponse.json(result)
}

/** POST /api/arbeitsplaetze — Neuen Arbeitsplatz registrieren */
export async function POST(req: NextRequest) {
  const body = await req.json()

  const id = newId()
  await db.insert(zleArbeitsplaetze).values({
    id,
    name: body.name,
    standort: body.standort ?? null,
    typ: body.typ ?? 'desktop',
    profilId: body.profilId ?? 'office',
    ecosystemId: body.ecosystemId ?? null,
    maschinenTyp: body.maschinenTyp ?? null,
    konfiguration: body.konfiguration ?? {
      widgets: ['todos', 'dokumentation', 'timer'],
      todoKategorien: ['allgemein'],
      eventQuellen: [],
    },
    dokumentation: body.dokumentation ?? [],
    autoLogoutMinuten: body.autoLogoutMinuten ?? 480,
    aktiv: true,
  })

  const [created] = await db
    .select()
    .from(zleArbeitsplaetze)
    .where(eq(zleArbeitsplaetze.id, id))

  return NextResponse.json(created, { status: 201 })
}
