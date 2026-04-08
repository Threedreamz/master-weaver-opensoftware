import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { zleArbeitsplatzSessions } from '@/db/schema'
import { eq, isNull, and } from 'drizzle-orm'

/** GET /api/arbeitsplaetze/:id/session — Aktive Session */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: arbeitsplatzId } = await params

  const [session] = await db
    .select()
    .from(zleArbeitsplatzSessions)
    .where(
      and(
        eq(zleArbeitsplatzSessions.arbeitsplatzId, arbeitsplatzId),
        isNull(zleArbeitsplatzSessions.logoutZeit),
      ),
    )

  return NextResponse.json({ session: session ?? null })
}
