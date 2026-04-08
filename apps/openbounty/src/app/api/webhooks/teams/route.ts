import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { zleZeiteintraege, zleMeetingZeiteintraege } from '@/db/schema'
import { eq, and, isNull } from 'drizzle-orm'
import { newId } from '@/lib/ids'
import { createHmac, timingSafeEqual } from 'crypto'

function verifySignature(body: string, signature: string | null): boolean {
  const secret = process.env.ZLE_TEAMS_WEBHOOK_SECRET
  if (!secret) return true
  if (!signature) return false
  const expected = createHmac('sha256', secret).update(body).digest('hex')
  try {
    return timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
  } catch {
    return false
  }
}

/** POST /api/webhooks/teams — Teams webhook receiver */
export async function POST(req: NextRequest) {
  const rawBody = await req.text()
  const signature = req.headers.get('x-teams-signature')

  if (!verifySignature(rawBody, signature)) {
    return NextResponse.json({ error: 'Ungueltige Signatur' }, { status: 401 })
  }

  const event = JSON.parse(rawBody) as {
    type: string
    meetingId: string
    meetingTitle?: string
    participantId?: string
    participantName?: string
    timestamp: string
  }

  const now = new Date(event.timestamp || Date.now())

  switch (event.type) {
    case 'meeting.started': {
      const zeId = newId()
      await db.insert(zleZeiteintraege).values({
        id: zeId,
        userId: 'system',
        startzeit: now,
        typ: 'meeting',
        quelle: 'teams',
        quelleId: event.meetingId,
        beschreibung: event.meetingTitle ?? `Teams-Meeting ${event.meetingId}`,
        abrechenbar: true,
        geloescht: false,
      })
      const mzId = newId()
      await db.insert(zleMeetingZeiteintraege).values({
        id: mzId,
        zeiteintrageId: zeId,
        meetingQuelle: 'teams',
        meetingRaumId: event.meetingId,
        meetingTitel: event.meetingTitle ?? null,
        teilnehmerAnzahl: 0,
        hatTranskript: false,
        hatAufzeichnung: false,
        zusammenfassungStatus: 'ausstehend',
      })
      return NextResponse.json({ ok: true, zeiteintrageId: zeId })
    }

    case 'participant.joined': {
      if (event.participantId) {
        const zeId = newId()
        await db.insert(zleZeiteintraege).values({
          id: zeId,
          userId: event.participantId,
          startzeit: now,
          typ: 'meeting',
          quelle: 'teams',
          quelleId: event.meetingId,
          beschreibung: `Teams-Teilnahme: ${event.participantName ?? event.participantId}`,
          abrechenbar: true,
          geloescht: false,
        })
      }
      return NextResponse.json({ ok: true })
    }

    case 'participant.left': {
      if (event.participantId) {
        const openEntries = await db
          .select()
          .from(zleZeiteintraege)
          .where(
            and(
              eq(zleZeiteintraege.userId, event.participantId),
              eq(zleZeiteintraege.quelleId, event.meetingId),
              eq(zleZeiteintraege.quelle, 'teams'),
              isNull(zleZeiteintraege.endzeit),
            ),
          )
        for (const entry of openEntries) {
          const dauer = Math.round((now.getTime() - entry.startzeit.getTime()) / 1000)
          await db
            .update(zleZeiteintraege)
            .set({ endzeit: now, dauer, updatedAt: now })
            .where(eq(zleZeiteintraege.id, entry.id))
        }
      }
      return NextResponse.json({ ok: true })
    }

    case 'meeting.ended': {
      const openEntries = await db
        .select()
        .from(zleZeiteintraege)
        .where(
          and(
            eq(zleZeiteintraege.quelleId, event.meetingId),
            eq(zleZeiteintraege.quelle, 'teams'),
            isNull(zleZeiteintraege.endzeit),
          ),
        )
      for (const entry of openEntries) {
        const dauer = Math.round((now.getTime() - entry.startzeit.getTime()) / 1000)
        await db
          .update(zleZeiteintraege)
          .set({ endzeit: now, dauer, updatedAt: now })
          .where(eq(zleZeiteintraege.id, entry.id))
      }
      const meetingEntries = await db
        .select()
        .from(zleMeetingZeiteintraege)
        .where(eq(zleMeetingZeiteintraege.meetingRaumId, event.meetingId))
      for (const me of meetingEntries) {
        await db
          .update(zleMeetingZeiteintraege)
          .set({ zusammenfassungStatus: 'ausstehend' })
          .where(eq(zleMeetingZeiteintraege.id, me.id))
      }
      return NextResponse.json({ ok: true })
    }

    default:
      return NextResponse.json({ ok: true, ignored: true })
  }
}
