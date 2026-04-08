import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { zleZeiteintraege, zleMeetingZeiteintraege } from '@/db/schema'
import { eq, and, isNull } from 'drizzle-orm'
import { newId } from '@/lib/ids'
import { createHmac, timingSafeEqual } from 'crypto'

function verifySignature(body: string, signature: string | null): boolean {
  const secret = process.env.ZLE_MEETILY_WEBHOOK_SECRET
  if (!secret) return true // Skip verification if no secret configured
  if (!signature) return false
  const expected = createHmac('sha256', secret).update(body).digest('hex')
  try {
    return timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
  } catch {
    return false
  }
}

/** POST /api/webhooks/meetily — Meetily webhook receiver */
export async function POST(req: NextRequest) {
  const rawBody = await req.text()
  const signature = req.headers.get('x-meetily-signature')

  if (!verifySignature(rawBody, signature)) {
    return NextResponse.json({ error: 'Ungueltige Signatur' }, { status: 401 })
  }

  const event = JSON.parse(rawBody) as {
    type: string
    roomId: string
    roomTitle?: string
    participantId?: string
    participantName?: string
    timestamp: string
  }

  const now = new Date(event.timestamp || Date.now())

  switch (event.type) {
    case 'room.started': {
      const zeId = newId()
      await db.insert(zleZeiteintraege).values({
        id: zeId,
        userId: 'system',
        startzeit: now,
        typ: 'meeting',
        quelle: 'meetily',
        quelleId: event.roomId,
        beschreibung: event.roomTitle ?? `Meetily-Meeting ${event.roomId}`,
        abrechenbar: true,
        geloescht: false,
      })
      const mzId = newId()
      await db.insert(zleMeetingZeiteintraege).values({
        id: mzId,
        zeiteintrageId: zeId,
        meetingQuelle: 'meetily',
        meetingRaumId: event.roomId,
        meetingTitel: event.roomTitle ?? null,
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
          quelle: 'meetily',
          quelleId: event.roomId,
          beschreibung: `Meetily-Teilnahme: ${event.participantName ?? event.participantId}`,
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
              eq(zleZeiteintraege.quelleId, event.roomId),
              eq(zleZeiteintraege.quelle, 'meetily'),
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

    case 'room.ended': {
      // Close all open entries for this room
      const openEntries = await db
        .select()
        .from(zleZeiteintraege)
        .where(
          and(
            eq(zleZeiteintraege.quelleId, event.roomId),
            eq(zleZeiteintraege.quelle, 'meetily'),
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
      // Set zusammenfassungStatus to 'ausstehend'
      const meetingEntries = await db
        .select()
        .from(zleMeetingZeiteintraege)
        .where(eq(zleMeetingZeiteintraege.meetingRaumId, event.roomId))
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
