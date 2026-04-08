import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { zleArbeitsplaetze, zleArbeitsplatzSessions, zleLeistungen, zleProofOfWorkScores } from '@/db/schema'
import { eq, isNull, and, desc, sql } from 'drizzle-orm'

/** GET /api/opendesktop/:id/status — PoW score + compliance + active session */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params

  // Get Arbeitsplatz
  const [ap] = await db.select().from(zleArbeitsplaetze).where(eq(zleArbeitsplaetze.id, id))
  if (!ap) return NextResponse.json({ error: 'Arbeitsplatz nicht gefunden' }, { status: 404 })

  // Active session
  const [activeSession] = await db
    .select()
    .from(zleArbeitsplatzSessions)
    .where(
      and(
        eq(zleArbeitsplatzSessions.arbeitsplatzId, id),
        isNull(zleArbeitsplatzSessions.logoutZeit),
      ),
    )

  // Today's PoW score for active user
  let powScore = null
  if (activeSession) {
    const today = new Date().toISOString().split('T')[0]
    const [score] = await db
      .select()
      .from(zleProofOfWorkScores)
      .where(
        and(
          eq(zleProofOfWorkScores.userId, activeSession.userId),
          eq(zleProofOfWorkScores.datum, today),
        ),
      )
    powScore = score || null
  }

  // Recent leistungen count (today)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const leistungenHeute = activeSession
    ? await db
        .select({ count: sql<number>`count(*)` })
        .from(zleLeistungen)
        .where(
          and(
            eq(zleLeistungen.userId, activeSession.userId),
            sql`${zleLeistungen.erfasstAm} >= ${today.getTime() / 1000}`,
          ),
        )
    : [{ count: 0 }]

  return NextResponse.json({
    arbeitsplatz: { id: ap.id, name: ap.name, profilId: ap.profilId, aktiv: ap.aktiv },
    activeSession: activeSession
      ? {
          id: activeSession.id,
          userId: activeSession.userId,
          loginZeit: activeSession.loginZeit,
          dauerSekunden: Math.floor((Date.now() - activeSession.loginZeit.getTime()) / 1000),
        }
      : null,
    proofOfWork: powScore,
    leistungenHeute: leistungenHeute[0]?.count || 0,
  })
}
