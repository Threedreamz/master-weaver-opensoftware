import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { zleArbeitsplatzSessions, zleZeiteintraege, zleAuditLog } from '@/db/schema'
import { eq, isNull, and } from 'drizzle-orm'
import { newId } from '@/lib/ids'

/** POST /api/arbeitsplaetze/:id/logout — Mitarbeiter ausloggen */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: arbeitsplatzId } = await params
  const now = new Date()

  // Find active session
  const [session] = await db
    .select()
    .from(zleArbeitsplatzSessions)
    .where(
      and(
        eq(zleArbeitsplatzSessions.arbeitsplatzId, arbeitsplatzId),
        isNull(zleArbeitsplatzSessions.logoutZeit),
      ),
    )

  if (!session) {
    return NextResponse.json({ error: 'Keine aktive Session' }, { status: 404 })
  }

  const loginTime = new Date(session.loginZeit).getTime()
  const dauer = Math.floor((now.getTime() - loginTime) / 1000)

  // Close session
  await db
    .update(zleArbeitsplatzSessions)
    .set({ logoutZeit: now, logoutTyp: 'manuell', dauer })
    .where(eq(zleArbeitsplatzSessions.id, session.id))

  // Close corresponding time entry
  await db
    .update(zleZeiteintraege)
    .set({ endzeit: now, dauer, updatedAt: now })
    .where(
      and(
        eq(zleZeiteintraege.quelleId, session.id),
        eq(zleZeiteintraege.quelle, 'arbeitsplatz_session'),
        isNull(zleZeiteintraege.endzeit),
      ),
    )

  // Audit log
  await db.insert(zleAuditLog).values({
    id: newId(),
    userId: session.userId,
    aktion: 'geaendert',
    entitaetTyp: 'arbeitsplatz_session',
    entitaetId: session.id,
    vorher: { logoutZeit: null },
    nachher: { logoutZeit: now.toISOString(), logoutTyp: 'manuell', dauer },
    timestamp: now,
  })

  return NextResponse.json({
    session: { ...session, logoutZeit: now.toISOString(), logoutTyp: 'manuell', dauer },
  })
}
