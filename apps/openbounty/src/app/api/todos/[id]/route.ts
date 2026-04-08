import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { zleAufgaben, zleAuditLog, zleLeistungen } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { newId } from '@/lib/ids'

/** PUT /api/todos/:id — Status aendern, bearbeiten */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const body = await req.json()
  const now = new Date()

  const [existing] = await db.select().from(zleAufgaben).where(eq(zleAufgaben.id, id))
  if (!existing) return NextResponse.json({ error: 'TODO nicht gefunden' }, { status: 404 })

  const updates: Record<string, unknown> = { ...body, updatedAt: now }

  // If being marked as completed, set erledigtAm and create Leistung
  if (body.status === 'erledigt' && existing.status !== 'erledigt') {
    updates.erledigtAm = now

    // Create Proof-of-Work entry
    await db.insert(zleLeistungen).values({
      id: newId(),
      userId: existing.userId ?? 'dev-user-1',
      projektId: existing.projektId,
      aufgabeId: id,
      typ: 'todo_erledigt',
      titel: `TODO erledigt: ${existing.titel}`,
      erfasstAm: now,
    })
  }

  await db.update(zleAufgaben).set(updates).where(eq(zleAufgaben.id, id))

  // Audit log
  await db.insert(zleAuditLog).values({
    id: newId(),
    userId: existing.userId ?? 'dev-user-1',
    aktion: 'geaendert',
    entitaetTyp: 'aufgabe',
    entitaetId: id,
    vorher: { status: existing.status },
    nachher: { status: body.status },
    timestamp: now,
  })

  const [updated] = await db.select().from(zleAufgaben).where(eq(zleAufgaben.id, id))
  return NextResponse.json(updated)
}
