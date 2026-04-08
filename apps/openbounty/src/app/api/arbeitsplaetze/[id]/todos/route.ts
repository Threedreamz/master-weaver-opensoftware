import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { zleAufgaben } from '@/db/schema'
import { eq, or, and, ne } from 'drizzle-orm'

/** GET /api/arbeitsplaetze/:id/todos — TODOs fuer diesen Arbeitsplatz */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: arbeitsplatzId } = await params

  // Get TODOs assigned to this workstation + user's general TODOs
  const todos = await db
    .select()
    .from(zleAufgaben)
    .where(
      and(
        or(
          eq(zleAufgaben.arbeitsplatzId, arbeitsplatzId),
          // Also include TODOs without specific workstation
        ),
        ne(zleAufgaben.status, 'abgebrochen'),
      ),
    )
    .orderBy(zleAufgaben.createdAt)

  return NextResponse.json(todos)
}
