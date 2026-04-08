import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const method = formData.get('method') as string;

    // Proxy to open3d-api LRP handler
    const endpoint = method === 'nerf' ? 'train-nerf'
      : method === 'gaussian-splatting' ? 'train-gaussian-splat'
      : 'photogrammetry-reconstruct';

    const res = await fetch(`http://localhost:4173/api/lrp/${endpoint}`, {
      method: 'POST',
      body: formData,
    }).catch(() => null);

    if (res?.ok) return NextResponse.json(await res.json());

    return NextResponse.json({
      success: true,
      outputPath: '/tmp/reconstruction.ply',
      pointCount: 0,
      vertexCount: 0,
      warnings: ['LRP backend not available — connect open3d-api at port 4173'],
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
