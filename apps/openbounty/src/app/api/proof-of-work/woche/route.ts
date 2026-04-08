import { NextRequest, NextResponse } from 'next/server'

/** GET /api/proof-of-work/woche — 7 Tages-Scores */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams
  const userId = sp.get('userId') ?? 'dev-user-1'

  const days: unknown[] = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const datum = d.toISOString().slice(0, 10)

    const url = new URL('/api/proof-of-work', req.nextUrl.origin)
    url.searchParams.set('userId', userId)
    url.searchParams.set('datum', datum)

    const res = await fetch(url.toString())
    const data = await res.json()
    days.push(data)
  }

  return NextResponse.json(days)
}
