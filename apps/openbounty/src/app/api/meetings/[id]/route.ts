import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { zleMeetingZeiteintraege, zleMeetingDokumentation, zleMeetingTodos, zleZeiteintraege, zleAufgaben } from '@/db/schema'
import { eq } from 'drizzle-orm'

/** GET /api/meetings/[id] — Meeting-Detail */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const [meeting] = await db
    .select({
      id: zleMeetingZeiteintraege.id,
      zeiteintrageId: zleMeetingZeiteintraege.zeiteintrageId,
      meetingQuelle: zleMeetingZeiteintraege.meetingQuelle,
      meetingRaumId: zleMeetingZeiteintraege.meetingRaumId,
      meetingTitel: zleMeetingZeiteintraege.meetingTitel,
      teilnehmerAnzahl: zleMeetingZeiteintraege.teilnehmerAnzahl,
      hatTranskript: zleMeetingZeiteintraege.hatTranskript,
      hatAufzeichnung: zleMeetingZeiteintraege.hatAufzeichnung,
      zusammenfassungStatus: zleMeetingZeiteintraege.zusammenfassungStatus,
      startzeit: zleZeiteintraege.startzeit,
      endzeit: zleZeiteintraege.endzeit,
      dauer: zleZeiteintraege.dauer,
      userId: zleZeiteintraege.userId,
    })
    .from(zleMeetingZeiteintraege)
    .innerJoin(zleZeiteintraege, eq(zleMeetingZeiteintraege.zeiteintrageId, zleZeiteintraege.id))
    .where(eq(zleMeetingZeiteintraege.id, id))

  if (!meeting) {
    return NextResponse.json({ error: 'Meeting nicht gefunden' }, { status: 404 })
  }

  const dokumentation = await db
    .select()
    .from(zleMeetingDokumentation)
    .where(eq(zleMeetingDokumentation.meetingZeiteintrageId, id))

  const todos = await db
    .select({
      id: zleMeetingTodos.id,
      aufgabeId: zleMeetingTodos.aufgabeId,
      transkriptAbschnitt: zleMeetingTodos.transkriptAbschnitt,
      konfidenz: zleMeetingTodos.konfidenz,
      bestaetigtVon: zleMeetingTodos.bestaetigtVon,
      bestaetigtAm: zleMeetingTodos.bestaetigtAm,
      // Aufgabe-Felder
      titel: zleAufgaben.titel,
      status: zleAufgaben.status,
      prioritaet: zleAufgaben.prioritaet,
    })
    .from(zleMeetingTodos)
    .innerJoin(zleAufgaben, eq(zleMeetingTodos.aufgabeId, zleAufgaben.id))
    .where(eq(zleMeetingTodos.meetingZeiteintrageId, id))

  return NextResponse.json({ meeting, dokumentation, todos })
}
