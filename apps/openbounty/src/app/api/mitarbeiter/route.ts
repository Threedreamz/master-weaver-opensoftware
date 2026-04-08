import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { zleMitarbeiter } from '@/db/schema'
import { eq, and } from 'drizzle-orm'

/** GET /api/mitarbeiter — List employees (default: only active with valid contract) */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const all = searchParams.get('all') === 'true'

  const employees = all
    ? await db.select().from(zleMitarbeiter)
    : await db
        .select()
        .from(zleMitarbeiter)
        .where(
          and(
            eq(zleMitarbeiter.status, 'aktiv'),
            eq(zleMitarbeiter.hatAktivenVertrag, true),
          ),
        )

  return NextResponse.json({ employees, count: employees.length })
}
