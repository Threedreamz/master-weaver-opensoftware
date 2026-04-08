import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { zleComplianceWarnungen } from '@/db/schema'
import { eq, and, gte, lte, desc } from 'drizzle-orm'

/** GET /api/compliance/warnungen — Liste aller Compliance-Warnungen */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams
  const userId = sp.get('userId')
  const typ = sp.get('typ')
  const von = sp.get('von')
  const bis = sp.get('bis')

  const conditions = []
  if (userId) conditions.push(eq(zleComplianceWarnungen.userId, userId))
  if (typ) conditions.push(eq(zleComplianceWarnungen.typ, typ as never))
  if (von) conditions.push(gte(zleComplianceWarnungen.datum, von))
  if (bis) conditions.push(lte(zleComplianceWarnungen.datum, bis))

  const result = await db
    .select()
    .from(zleComplianceWarnungen)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(zleComplianceWarnungen.datum))
    .limit(100)

  return NextResponse.json(result)
}
