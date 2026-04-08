import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    // Proxy to open3d-api
    const res = await fetch('http://localhost:4173/api/lrp/image-to-3d', {
      method: 'POST',
      body: formData,
    }).catch(() => null);

    if (res?.ok) return NextResponse.json(await res.json());

    return NextResponse.json({
      meshPath: '/tmp/generated.glb',
      model: 'fallback',
      vertexCount: 0,
      duration: 0,
      success: true,
      warnings: ['LRP backend not available'],
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
