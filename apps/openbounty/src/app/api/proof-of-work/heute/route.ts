import { NextRequest, NextResponse } from 'next/server'

/** GET /api/proof-of-work/heute — Shortcut fuer heute */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams
  const userId = sp.get('userId') ?? 'dev-user-1'
  const heute = new Date().toISOString().slice(0, 10)

  const url = new URL('/api/proof-of-work', req.nextUrl.origin)
  url.searchParams.set('userId', userId)
  url.searchParams.set('datum', heute)

  const res = await fetch(url.toString())
  const data = await res.json()
  return NextResponse.json(data)
}
