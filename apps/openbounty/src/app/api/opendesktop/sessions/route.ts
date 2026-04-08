import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { zleArbeitsplatzSessions, zleArbeitsplaetze, zleZeiteintraege } from '@/db/schema'
import { eq, isNull, and } from 'drizzle-orm'
import { newId } from '@/lib/ids'

/** POST /api/opendesktop/sessions — Start or end a session */
export async function POST(req: NextRequest) {
  const body = await req.json()
  const { action, arbeitsplatzId, userId, notizen } = body as {
    action: 'start' | 'end'
    arbeitsplatzId: string
    userId: string
    notizen?: string
  }

  if (!action || !arbeitsplatzId || !userId) {
    return NextResponse.json({ error: 'action, arbeitsplatzId, and userId are required' }, { status: 400 })
  }

  // Verify Arbeitsplatz exists
  const [ap] = await db.select().from(zleArbeitsplaetze).where(eq(zleArbeitsplaetze.id, arbeitsplatzId))
  if (!ap) return NextResponse.json({ error: 'Arbeitsplatz nicht gefunden' }, { status: 404 })

  if (action === 'start') {
    // Check no active session exists
    const [active] = await db.select().from(zleArbeitsplatzSessions).where(
      and(
        eq(zleArbeitsplatzSessions.arbeitsplatzId, arbeitsplatzId),
        isNull(zleArbeitsplatzSessions.logoutZeit),
      ),
    )
    if (active) {
      return NextResponse.json({ error: 'Station bereits belegt', session: active }, { status: 409 })
    }

    const now = new Date()
    const sessionId = newId()

    await db.insert(zleArbeitsplatzSessions).values({
      id: sessionId,
      arbeitsplatzId,
      userId,
      loginZeit: now,
    })

    // Create accompanying time entry
    await db.insert(zleZeiteintraege).values({
      id: newId(),
      userId,
      typ: 'arbeitsplatz',
      quelle: 'arbeitsplatz_session',
      quelleId: sessionId,
      arbeitsplatzId,
      startzeit: now,
      abrechenbar: true,
      geloescht: false,
    })

    return NextResponse.json({ sessionId, loginZeit: now.toISOString() }, { status: 201 })
  }

  if (action === 'end') {
    // Find active session for this user at this station
    const [session] = await db.select().from(zleArbeitsplatzSessions).where(
      and(
        eq(zleArbeitsplatzSessions.arbeitsplatzId, arbeitsplatzId),
        eq(zleArbeitsplatzSessions.userId, userId),
        isNull(zleArbeitsplatzSessions.logoutZeit),
      ),
    )

    if (!session) {
      return NextResponse.json({ error: 'Keine aktive Session gefunden' }, { status: 404 })
    }

    const now = new Date()
    const dauer = Math.floor((now.getTime() - session.loginZeit.getTime()) / 1000)

    // Close session
    await db.update(zleArbeitsplatzSessions).set({
      logoutZeit: now,
      logoutTyp: 'manuell',
      dauer,
      notizen: notizen || null,
    }).where(eq(zleArbeitsplatzSessions.id, session.id))

    // Close time entry
    await db.update(zleZeiteintraege).set({
      endzeit: now,
      dauer,
      updatedAt: now,
    }).where(
      and(
        eq(zleZeiteintraege.quelleId, session.id),
        eq(zleZeiteintraege.quelle, 'arbeitsplatz_session'),
      ),
    )

    return NextResponse.json({ sessionId: session.id, dauer, logoutZeit: now.toISOString() })
  }

  return NextResponse.json({ error: 'action must be "start" or "end"' }, { status: 400 })
}
