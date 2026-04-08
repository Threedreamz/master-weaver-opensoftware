import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { zleArbeitsplatzSessions, zleArbeitsplaetze, zleZeiteintraege, zleAuditLog, zleMitarbeiter } from '@/db/schema'
import { eq, isNull, and } from 'drizzle-orm'
import { newId } from '@/lib/ids'

/** POST /api/arbeitsplaetze/:id/login — Mitarbeiter einloggen */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: arbeitsplatzId } = await params

  // Verify Arbeitsplatz exists
  const [ap] = await db.select().from(zleArbeitsplaetze).where(eq(zleArbeitsplaetze.id, arbeitsplatzId))
  if (!ap) return NextResponse.json({ error: 'Arbeitsplatz nicht gefunden' }, { status: 404 })

  // Check for existing active session at this station
  const [existingSession] = await db
    .select()
    .from(zleArbeitsplatzSessions)
    .where(
      and(
        eq(zleArbeitsplatzSessions.arbeitsplatzId, arbeitsplatzId),
        isNull(zleArbeitsplatzSessions.logoutZeit),
      ),
    )

  if (existingSession) {
    return NextResponse.json(
      { error: 'Station bereits belegt', session: existingSession },
      { status: 409 },
    )
  }

  // Resolve userId from personalnummer or fall back to dev mode
  const body = await req.json().catch(() => ({}))
  const { personalnummer } = body as { personalnummer?: string }

  let userId: string

  if (personalnummer) {
    // Look up employee in synced mitarbeiter cache
    const [mitarbeiter] = await db
      .select()
      .from(zleMitarbeiter)
      .where(eq(zleMitarbeiter.personalnummer, personalnummer))

    if (!mitarbeiter) {
      return NextResponse.json(
        { error: `Mitarbeiter mit Personalnummer ${personalnummer} nicht gefunden` },
        { status: 404 },
      )
    }

    if (mitarbeiter.status !== 'aktiv') {
      return NextResponse.json(
        { error: `Mitarbeiter ${personalnummer} ist nicht aktiv (Status: ${mitarbeiter.status})` },
        { status: 403 },
      )
    }

    if (!mitarbeiter.hatAktivenVertrag) {
      return NextResponse.json(
        { error: 'Kein aktiver Vertrag. Bitte Personalabteilung kontaktieren.' },
        { status: 403 },
      )
    }

    userId = mitarbeiter.id
  } else {
    // Dev fallback — no personalnummer provided
    userId = 'dev-user-1'
  }

  const now = new Date()
  const sessionId = newId()
  const zeiteintrageId = newId()

  // Create session
  await db.insert(zleArbeitsplatzSessions).values({
    id: sessionId,
    arbeitsplatzId,
    userId,
    loginZeit: now,
  })

  // Create time entry
  await db.insert(zleZeiteintraege).values({
    id: zeiteintrageId,
    userId,
    typ: 'arbeitsplatz',
    quelle: 'arbeitsplatz_session',
    quelleId: sessionId,
    arbeitsplatzId,
    startzeit: now,
    abrechenbar: true,
    geloescht: false,
  })

  // Audit log
  await db.insert(zleAuditLog).values({
    id: newId(),
    userId,
    aktion: 'erstellt',
    entitaetTyp: 'arbeitsplatz_session',
    entitaetId: sessionId,
    nachher: { arbeitsplatzId, personalnummer: personalnummer || 'dev', loginZeit: now.toISOString() },
    timestamp: now,
  })

  return NextResponse.json({
    session: { id: sessionId, userId, loginZeit: now.toISOString() },
  }, { status: 201 })
}
