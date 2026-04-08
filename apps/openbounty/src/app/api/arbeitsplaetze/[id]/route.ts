import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { zleArbeitsplaetze } from '@/db/schema'
import { eq } from 'drizzle-orm'

/** GET /api/arbeitsplaetze/:id — Arbeitsplatz-Details */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const [ap] = await db.select().from(zleArbeitsplaetze).where(eq(zleArbeitsplaetze.id, id))
  if (!ap) return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 })
  return NextResponse.json(ap)
}

/** PUT /api/arbeitsplaetze/:id — Konfiguration aendern */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const body = await req.json()
  await db
    .update(zleArbeitsplaetze)
    .set({ ...body, updatedAt: new Date() })
    .where(eq(zleArbeitsplaetze.id, id))
  const [updated] = await db.select().from(zleArbeitsplaetze).where(eq(zleArbeitsplaetze.id, id))
  return NextResponse.json(updated)
}
