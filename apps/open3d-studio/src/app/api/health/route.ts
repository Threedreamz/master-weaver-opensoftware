import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    app: 'open3d-studio',
    timestamp: new Date().toISOString(),
  });
}
