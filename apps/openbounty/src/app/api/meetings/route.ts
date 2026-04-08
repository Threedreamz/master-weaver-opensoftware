import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { zleMeetingZeiteintraege, zleZeiteintraege } from '@/db/schema'
import { eq, desc } from 'drizzle-orm'

/** GET /api/meetings — Liste aller Meetings */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams
  const limit = Math.min(Number(sp.get('limit') ?? 50), 200)

  const result = await db
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
      createdAt: zleMeetingZeiteintraege.createdAt,
      // Zeiteintrag-Felder
      startzeit: zleZeiteintraege.startzeit,
      endzeit: zleZeiteintraege.endzeit,
      dauer: zleZeiteintraege.dauer,
      userId: zleZeiteintraege.userId,
    })
    .from(zleMeetingZeiteintraege)
    .innerJoin(zleZeiteintraege, eq(zleMeetingZeiteintraege.zeiteintrageId, zleZeiteintraege.id))
    .orderBy(desc(zleZeiteintraege.startzeit))
    .limit(limit)

  return NextResponse.json(result)
}
