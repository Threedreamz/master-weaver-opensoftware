import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { zleZeiteintraege, zleProjekte } from '@/db/schema'
import { eq, and, gte, lte } from 'drizzle-orm'

/** POST /api/berichte/export — CSV/JSON Export */
export async function POST(req: NextRequest) {
  const body = await req.json()
  const format = body.format ?? 'csv'
  const von = body.von
  const bis = body.bis
  const userId = body.userId

  if (!von || !bis) {
    return NextResponse.json({ error: 'von und bis sind erforderlich' }, { status: 400 })
  }

  const conditions = [
    gte(zleZeiteintraege.startzeit, new Date(von + 'T00:00:00')),
    lte(zleZeiteintraege.startzeit, new Date(bis + 'T23:59:59')),
    eq(zleZeiteintraege.geloescht, false),
  ]
  if (userId) conditions.push(eq(zleZeiteintraege.userId, userId))

  const rows = await db
    .select({
      id: zleZeiteintraege.id,
      userId: zleZeiteintraege.userId,
      projektId: zleZeiteintraege.projektId,
      startzeit: zleZeiteintraege.startzeit,
      endzeit: zleZeiteintraege.endzeit,
      dauer: zleZeiteintraege.dauer,
      beschreibung: zleZeiteintraege.beschreibung,
      typ: zleZeiteintraege.typ,
      quelle: zleZeiteintraege.quelle,
      abrechenbar: zleZeiteintraege.abrechenbar,
    })
    .from(zleZeiteintraege)
    .where(and(...conditions))

  if (format === 'json') {
    return NextResponse.json(rows)
  }

  // CSV with ; separator, German date format
  const header = 'ID;Benutzer;Projekt;Datum;Start;Ende;Dauer (h);Beschreibung;Typ;Quelle;Abrechenbar'
  const csvRows = rows.map((r) => {
    const start = r.startzeit
    const datum = start
      ? `${start.getDate().toString().padStart(2, '0')}.${(start.getMonth() + 1).toString().padStart(2, '0')}.${start.getFullYear()}`
      : ''
    const startzeit = start
      ? `${start.getHours().toString().padStart(2, '0')}:${start.getMinutes().toString().padStart(2, '0')}`
      : ''
    const endzeit = r.endzeit
      ? `${r.endzeit.getHours().toString().padStart(2, '0')}:${r.endzeit.getMinutes().toString().padStart(2, '0')}`
      : ''
    const dauerH = r.dauer ? (r.dauer / 3600).toFixed(2).replace('.', ',') : ''
    const beschreibung = (r.beschreibung ?? '').replace(/;/g, ',').replace(/\n/g, ' ')
    return `${r.id};${r.userId};${r.projektId ?? ''};${datum};${startzeit};${endzeit};${dauerH};${beschreibung};${r.typ};${r.quelle};${r.abrechenbar ? 'Ja' : 'Nein'}`
  })

  const csv = [header, ...csvRows].join('\n')
  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="zeiterfassung_${von}_${bis}.csv"`,
    },
  })
}
