import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { zleAuditLog } from '@/db/schema'
import { eq, and, gte, lte, desc } from 'drizzle-orm'

/** GET /api/compliance/audit-log — Paginiertes Audit-Log */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams
  const limit = Math.min(Number(sp.get('limit') ?? 50), 200)
  const offset = Number(sp.get('offset') ?? 0)
  const userId = sp.get('userId')
  const entitaetTyp = sp.get('entitaetTyp')
  const von = sp.get('von')
  const bis = sp.get('bis')

  const conditions = []
  if (userId) conditions.push(eq(zleAuditLog.userId, userId))
  if (entitaetTyp) conditions.push(eq(zleAuditLog.entitaetTyp, entitaetTyp))
  if (von) conditions.push(gte(zleAuditLog.timestamp, new Date(von)))
  if (bis) conditions.push(lte(zleAuditLog.timestamp, new Date(bis)))

  const result = await db
    .select()
    .from(zleAuditLog)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(zleAuditLog.timestamp))
    .limit(limit)
    .offset(offset)

  return NextResponse.json({ data: result, limit, offset })
}
