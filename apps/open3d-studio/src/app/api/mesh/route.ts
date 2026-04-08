import { NextRequest, NextResponse } from 'next/server';

const API_BASE = process.env.OPEN3D_API_URL || 'http://localhost:4173';

/**
 * Proxy a generated mesh file from the backend filesystem.
 * Usage: GET /api/mesh?path=/var/folders/.../file.glb
 */
export async function GET(request: NextRequest) {
  const meshPath = request.nextUrl.searchParams.get('path');
  if (!meshPath) {
    return NextResponse.json({ error: 'Missing path parameter' }, { status: 400 });
  }

  // Fetch the file from the backend (which has filesystem access)
  try {
    const res = await fetch(`${API_BASE}/api/file?path=${encodeURIComponent(meshPath)}`);
    if (!res.ok) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }
    const data = await res.arrayBuffer();
    const ext = meshPath.split('.').pop() || 'bin';
    const mimeMap: Record<string, string> = {
      stl: 'model/stl',
      obj: 'text/plain',
      glb: 'model/gltf-binary',
      gltf: 'model/gltf+json',
    };
    return new NextResponse(data, {
      headers: {
        'Content-Type': mimeMap[ext] || 'application/octet-stream',
        'Content-Disposition': `inline; filename="generated.${ext}"`,
      },
    });
  } catch {
    return NextResponse.json({ error: 'Backend unavailable' }, { status: 502 });
  }
}
