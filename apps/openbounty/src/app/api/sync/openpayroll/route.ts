import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { zleMitarbeiter, zleAuditLog } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { newId } from '@/lib/ids'

const OPENPAYROLL_URL = process.env.OPENPAYROLL_URL || 'http://localhost:4168'
const OPENPAYROLL_API_KEY = process.env.OPENPAYROLL_API_KEY || ''

/** SHA-256 hash for change detection */
async function syncHash(data: Record<string, unknown>): Promise<string> {
  const str = JSON.stringify(data, Object.keys(data).sort())
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str))
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
}

/** POST /api/sync/openpayroll — Pull employees from OpenPayroll */
export async function POST(req: NextRequest) {
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (OPENPAYROLL_API_KEY) headers['x-api-key'] = OPENPAYROLL_API_KEY

    const res = await fetch(`${OPENPAYROLL_URL}/api/external/employees`, { headers })
    if (!res.ok) {
      return NextResponse.json(
        { error: `OpenPayroll responded with ${res.status}` },
        { status: 502 },
      )
    }

    const { employees } = await res.json() as {
      employees: Array<{
        id: number
        personalnummer: string
        vorname: string
        nachname: string
        status: 'aktiv' | 'inaktiv' | 'ausgeschieden'
        bundesland: string | null
        bruttoGehalt: number
        stundenlohn: number | null
        arbeitsstundenProWoche: number | null
      }>
    }

    let created = 0
    let updated = 0
    let unchanged = 0

    for (const emp of employees) {
      const hashData = {
        vorname: emp.vorname,
        nachname: emp.nachname,
        status: emp.status,
        bruttoGehalt: emp.bruttoGehalt,
        stundenlohn: emp.stundenlohn,
        arbeitsstundenProWoche: emp.arbeitsstundenProWoche,
      }
      const hash = await syncHash(hashData)

      const [existing] = await db
        .select()
        .from(zleMitarbeiter)
        .where(eq(zleMitarbeiter.personalnummer, emp.personalnummer))

      const hatAktivenVertrag = emp.status === 'aktiv' && (emp.arbeitsstundenProWoche ?? 0) > 0

      if (!existing) {
        // New employee
        const id = newId()
        await db.insert(zleMitarbeiter).values({
          id,
          openpayrollId: emp.id,
          personalnummer: emp.personalnummer,
          vorname: emp.vorname,
          nachname: emp.nachname,
          status: emp.status,
          bundesland: emp.bundesland || 'NW',
          wochenstunden: emp.arbeitsstundenProWoche,
          stundenlohn: emp.stundenlohn,
          bruttoGehalt: emp.bruttoGehalt,
          hatAktivenVertrag,
          syncedAt: new Date(),
          syncHash: hash,
        })
        created++
      } else if (existing.syncHash !== hash) {
        // Changed — update
        await db.update(zleMitarbeiter)
          .set({
            vorname: emp.vorname,
            nachname: emp.nachname,
            status: emp.status,
            bundesland: emp.bundesland || 'NW',
            wochenstunden: emp.arbeitsstundenProWoche,
            stundenlohn: emp.stundenlohn,
            bruttoGehalt: emp.bruttoGehalt,
            hatAktivenVertrag,
            syncedAt: new Date(),
            syncHash: hash,
            updatedAt: new Date(),
          })
          .where(eq(zleMitarbeiter.id, existing.id))
        updated++
      } else {
        unchanged++
      }
    }

    // Audit log
    await db.insert(zleAuditLog).values({
      id: newId(),
      userId: 'system',
      aktion: 'sync',
      entitaetTyp: 'mitarbeiter',
      entitaetId: 'openpayroll',
      nachher: { total: employees.length, created, updated, unchanged },
      timestamp: new Date(),
    })

    return NextResponse.json({
      success: true,
      total: employees.length,
      created,
      updated,
      unchanged,
    })
  } catch (err) {
    return NextResponse.json(
      { error: `Sync failed: ${err instanceof Error ? err.message : String(err)}` },
      { status: 500 },
    )
  }
}
