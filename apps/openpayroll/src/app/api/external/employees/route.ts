import { NextRequest, NextResponse } from 'next/server'
import { db, schema } from '@/db'
import { eq } from 'drizzle-orm'

/** Validate API key for external service access */
function validateApiKey(req: NextRequest): boolean {
  const apiKey = req.headers.get('x-api-key')
  const expected = process.env.OPENBOUNTY_API_KEY
  if (!expected) return true // No key configured = allow (dev mode)
  return apiKey === expected
}

/** GET /api/external/employees — Export employees for OpenBounty sync */
export async function GET(req: NextRequest) {
  if (!validateApiKey(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')

  if (id) {
    // Single employee by personalnummer
    const [employee] = await db
      .select({
        id: schema.payMitarbeiter.id,
        personalnummer: schema.payMitarbeiter.personalnummer,
        vorname: schema.payMitarbeiter.vorname,
        nachname: schema.payMitarbeiter.nachname,
        status: schema.payMitarbeiter.status,
        bundesland: schema.payMitarbeiter.bundesland,
        bruttoGehalt: schema.payMitarbeiter.bruttoGehalt,
        stundenlohn: schema.payMitarbeiter.stundenlohn,
        arbeitsstundenProWoche: schema.payMitarbeiter.arbeitsstundenProWoche,
      })
      .from(schema.payMitarbeiter)
      .where(eq(schema.payMitarbeiter.personalnummer, id))

    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 })
    }
    return NextResponse.json(employee)
  }

  // All employees (optionally filter by status)
  const statusFilter = searchParams.get('status')

  let query = db
    .select({
      id: schema.payMitarbeiter.id,
      personalnummer: schema.payMitarbeiter.personalnummer,
      vorname: schema.payMitarbeiter.vorname,
      nachname: schema.payMitarbeiter.nachname,
      status: schema.payMitarbeiter.status,
      bundesland: schema.payMitarbeiter.bundesland,
      bruttoGehalt: schema.payMitarbeiter.bruttoGehalt,
      stundenlohn: schema.payMitarbeiter.stundenlohn,
      arbeitsstundenProWoche: schema.payMitarbeiter.arbeitsstundenProWoche,
    })
    .from(schema.payMitarbeiter)

  const employees = statusFilter
    ? await query.where(eq(schema.payMitarbeiter.status, statusFilter as 'aktiv' | 'inaktiv' | 'ausgeschieden'))
    : await query

  return NextResponse.json({ employees, count: employees.length })
}
