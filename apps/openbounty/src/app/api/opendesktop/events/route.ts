import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { zleLeistungen, zleZeiteintraege, zleAuditLog } from '@/db/schema'
import { isKnownEvent, getEventConfig } from '@/config/events'
import { newId } from '@/lib/ids'

interface EventBody {
  source: string
  eventType: string
  timestamp?: string
  userId?: string
  arbeitsplatzId?: string
  data?: Record<string, unknown>
}

/** POST /api/opendesktop/events — Universal event receiver */
export async function POST(req: NextRequest) {
  const body = (await req.json()) as EventBody
  const { source, eventType, userId, arbeitsplatzId, data } = body

  if (!source || !eventType) {
    return NextResponse.json({ error: 'source and eventType are required' }, { status: 400 })
  }

  if (!isKnownEvent(eventType)) {
    return NextResponse.json(
      { error: `Unknown event type: ${eventType}`, knownPrefix: source + '.*' },
      { status: 422 },
    )
  }

  const config = getEventConfig(eventType)!
  const now = new Date()
  const effectiveUserId = userId || 'system'

  if (config.erzeugt === 'leistung') {
    // Create a Leistung (performance entry)
    const leistungId = newId()
    await db.insert(zleLeistungen).values({
      id: leistungId,
      userId: effectiveUserId,
      typ: (config.leistungTyp || 'custom') as 'commit' | 'pr' | 'deployment' | 'review' | 'todo_erledigt' | 'meeting_teilnahme' | 'dokumentation' | 'custom',
      titel: config.titel || eventType,
      beschreibung: `Event von ${source}: ${eventType}`,
      metadata: { source, eventType, ...data },
      erfasstAm: now,
    })

    // Audit log
    await db.insert(zleAuditLog).values({
      id: newId(),
      userId: effectiveUserId,
      aktion: 'erstellt',
      entitaetTyp: 'leistung',
      entitaetId: leistungId,
      nachher: { source, eventType, data },
      timestamp: now,
    })

    return NextResponse.json({ created: 'leistung', id: leistungId, titel: config.titel })
  }

  if (config.erzeugt === 'zeiteintrag') {
    // Create a time entry (for events like scan.started, druck.started)
    const zeiteintrageId = newId()
    await db.insert(zleZeiteintraege).values({
      id: zeiteintrageId,
      userId: effectiveUserId,
      typ: 'arbeitsplatz',
      quelle: 'api',
      quelleId: `${source}:${eventType}`,
      arbeitsplatzId: arbeitsplatzId || null,
      startzeit: now,
      abrechenbar: true,
      geloescht: false,
    })

    return NextResponse.json({ created: 'zeiteintrag', id: zeiteintrageId })
  }

  if (config.erzeugt === 'update') {
    // Handle update actions (e.g., close_meeting)
    return NextResponse.json({ created: 'update', aktion: config.aktion, note: 'Processed' })
  }

  return NextResponse.json({ error: 'Unhandled event action' }, { status: 500 })
}
