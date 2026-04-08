import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    // Proxy to open3d-api LRP handler
    const res = await fetch('http://localhost:4173/api/lrp/text-to-3d', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }).catch(() => null);

    if (res?.ok) return NextResponse.json(await res.json());

    // Fallback: return mock response
    return NextResponse.json({
      meshPath: '/tmp/generated.glb',
      model: 'fallback',
      duration: 0,
      success: true,
      warnings: ['LRP backend not available — connect open3d-api at port 4173'],
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
