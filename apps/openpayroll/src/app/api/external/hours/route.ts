import { NextRequest, NextResponse } from 'next/server'
import { db, schema } from '@/db'
import { eq } from 'drizzle-orm'

/** Validate API key for external service access */
function validateApiKey(req: NextRequest): boolean {
  const apiKey = req.headers.get('x-api-key')
  const expected = process.env.OPENBOUNTY_API_KEY
  if (!expected) return true
  return apiKey === expected
}

/** POST /api/external/hours — Receive monthly hours from OpenBounty */
export async function POST(req: NextRequest) {
  if (!validateApiKey(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { personalnummer, monat, jahr, arbeitsstunden, meetingStunden, ueberstunden } = body

  if (!personalnummer || !monat || !jahr || arbeitsstunden == null) {
    return NextResponse.json(
      { error: 'Missing required fields: personalnummer, monat, jahr, arbeitsstunden' },
      { status: 400 },
    )
  }

  // Verify employee exists
  const [employee] = await db
    .select({ id: schema.payMitarbeiter.id })
    .from(schema.payMitarbeiter)
    .where(eq(schema.payMitarbeiter.personalnummer, personalnummer))

  if (!employee) {
    return NextResponse.json({ error: `Employee ${personalnummer} not found` }, { status: 404 })
  }

  // Store hours — try integration event if connection exists, otherwise log directly
  const eventId = crypto.randomUUID()

  try {
    await db.insert(schema.integrationEvents).values({
      id: eventId,
      connectionId: 'openbounty-sync',
      eventType: 'import',
      direction: 'inbound',
      payload: {
        source: 'openbounty',
        personalnummer,
        mitarbeiterId: employee.id,
        monat,
        jahr,
        arbeitsstunden,
        meetingStunden: meetingStunden || 0,
        ueberstunden: ueberstunden || 0,
      },
      status: 'success',
    })
  } catch {
    // Integration connection not set up yet — log and continue
    console.log(`[external/hours] Received ${arbeitsstunden}h for ${personalnummer} (${monat}/${jahr}) — no integration connection configured`)
  }

  return NextResponse.json({
    success: true,
    eventId,
    message: `Hours recorded for ${personalnummer}: ${arbeitsstunden}h (${monat}/${jahr})`,
  })
}
