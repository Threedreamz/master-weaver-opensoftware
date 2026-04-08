import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    app: 'openbounty-web',
    timestamp: new Date().toISOString(),
  })
}
