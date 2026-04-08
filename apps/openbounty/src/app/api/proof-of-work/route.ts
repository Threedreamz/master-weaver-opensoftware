import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { zleZeiteintraege, zleAufgaben, zleLeistungen } from '@/db/schema'
import { eq, and, gte, lte, count, sql } from 'drizzle-orm'

/** GET /api/proof-of-work — Berechne PoW-Score fuer userId+datum */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams
  const userId = sp.get('userId') ?? 'dev-user-1'
  const datum = sp.get('datum') ?? new Date().toISOString().slice(0, 10)

  const dayStart = new Date(datum + 'T00:00:00')
  const dayEnd = new Date(datum + 'T23:59:59')

  // Arbeitsstunden
  const zeitRows = await db
    .select()
    .from(zleZeiteintraege)
    .where(
      and(
        eq(zleZeiteintraege.userId, userId),
        gte(zleZeiteintraege.startzeit, dayStart),
        lte(zleZeiteintraege.startzeit, dayEnd),
        eq(zleZeiteintraege.geloescht, false),
      ),
    )

  let totalSeconds = 0
  let meetingSeconds = 0
  for (const row of zeitRows) {
    const d = row.dauer ?? 0
    totalSeconds += d
    if (row.typ === 'meeting') meetingSeconds += d
  }
  const arbeitsstunden = totalSeconds / 3600
  const meetingStunden = meetingSeconds / 3600

  // TODOs erledigt
  const [todosResult] = await db
    .select({ count: count() })
    .from(zleAufgaben)
    .where(
      and(
        eq(zleAufgaben.userId, userId),
        eq(zleAufgaben.status, 'erledigt'),
        gte(zleAufgaben.erledigtAm, dayStart),
        lte(zleAufgaben.erledigtAm, dayEnd),
      ),
    )
  const todosErledigt = todosResult?.count ?? 0

  // Leistungen (commits, doku, etc.)
  const leistungen = await db
    .select()
    .from(zleLeistungen)
    .where(
      and(
        eq(zleLeistungen.userId, userId),
        gte(zleLeistungen.erfasstAm, dayStart),
        lte(zleLeistungen.erfasstAm, dayEnd),
      ),
    )

  const commitsAnzahl = leistungen.filter((l) => l.typ === 'commit').length
  const dokuAnzahl = leistungen.filter((l) => l.typ === 'dokumentation').length

  // Score: TODOs 30%, Git 25%, Meeting 15%, Doku 15%, Praesenz 15%
  const todoScore = Math.min(100, todosErledigt * 25) // 4 TODOs = 100%
  const gitScore = Math.min(100, commitsAnzahl * 20) // 5 commits = 100%
  const meetingScore = Math.min(100, meetingStunden * 50) // 2h meetings = 100%
  const dokuScore = Math.min(100, dokuAnzahl * 33) // 3 docs = 100%
  const praesenzScore = Math.min(100, (arbeitsstunden / 8) * 100) // 8h = 100%

  const score = Math.round(
    todoScore * 0.3 + gitScore * 0.25 + meetingScore * 0.15 + dokuScore * 0.15 + praesenzScore * 0.15,
  )

  return NextResponse.json({
    userId,
    datum,
    arbeitsstunden: Math.round(arbeitsstunden * 100) / 100,
    meetingStunden: Math.round(meetingStunden * 100) / 100,
    leistungenAnzahl: leistungen.length,
    todosErledigt,
    commitsAnzahl,
    score: Math.min(100, score),
    details: { todoScore, gitScore, meetingScore, dokuScore, praesenzScore },
  })
}
