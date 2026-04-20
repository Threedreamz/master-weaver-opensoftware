import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { tmpdir } from 'os';
import { resolve, basename } from 'path';
import { homedir } from 'os';

const ALLOWED_ROOTS = [
  tmpdir(),
  `${homedir()}/Downloads`,
  `${homedir()}/Desktop`,
  `${homedir()}/Documents`,
];

const MIME: Record<string, string> = {
  usdz:    'model/vnd.usdz+zip',
  reality: 'application/octet-stream',
  obj:     'model/obj',
  ply:     'application/octet-stream',
  glb:     'model/gltf-binary',
  gltf:    'model/gltf+json',
  stl:     'model/stl',
  png:     'image/png',
  jpg:     'image/jpeg',
};

export async function GET(request: NextRequest) {
  const filePath = request.nextUrl.searchParams.get('path');
  if (!filePath) {
    return NextResponse.json({ error: 'Missing ?path= parameter' }, { status: 400 });
  }

  const resolved = resolve(filePath);

  const allowed = ALLOWED_ROOTS.some(root => resolved.startsWith(resolve(root)));
  if (!allowed) {
    return NextResponse.json({ error: 'Path not in allowed directories' }, { status: 403 });
  }

  if (!existsSync(resolved)) {
    return NextResponse.json({ error: 'File not found' }, { status: 404 });
  }

  const buf = await readFile(resolved);
  const ext = basename(resolved).split('.').pop()?.toLowerCase() ?? '';
  const mime = MIME[ext] ?? 'application/octet-stream';

  return new NextResponse(buf, {
    headers: {
      'Content-Type': mime,
      'Content-Disposition': `attachment; filename="${basename(resolved)}"`,
      'Content-Length': String(buf.length),
    },
  });
}
