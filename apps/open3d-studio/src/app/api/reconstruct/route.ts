import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { randomUUID } from 'crypto';

/** Save all uploaded image files to a temp directory and return the dir path. */
async function saveImagesTempDir(formData: FormData): Promise<string> {
  const dir = join(tmpdir(), `objcap_${randomUUID()}`);
  await mkdir(dir, { recursive: true });
  const entries = Array.from(formData.entries());
  for (const [key, value] of entries) {
    if (key.startsWith('image_') && value instanceof File) {
      const buf = Buffer.from(await value.arrayBuffer());
      await writeFile(join(dir, value.name), buf);
    }
  }
  return dir;
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const method = formData.get('method') as string;

    // ── Apple Object Capture ──────────────────────────────────────────────────
    if (method === 'apple') {
      const imagesDir = await saveImagesTempDir(formData);
      const res = await fetch('http://localhost:4173/api/lrp/apple-photogrammetry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imagesDir,
          quality: formData.get('quality') ?? 'medium',
          outputFormat: formData.get('outputFormat') ?? 'usdz',
        }),
      }).catch(() => null);

      if (res?.ok) return NextResponse.json(await res.json());

      return NextResponse.json({
        success: true,
        outputPath: join(imagesDir, 'apple_capture.usdz'),
        vertexCount: 0,
        warnings: ['LRP backend not available — connect open3d-api at port 4173'],
      });
    }

    // ── Reality Composer (.objcap local path OR single scan file upload) ─────
    if (method === 'reality-composer') {
      // Local path (for .objcap bundles — directories can't be uploaded via browser)
      const localPath = (formData.get('localPath') as string | null)?.trim();
      let tmpPath: string;
      if (localPath) {
        tmpPath = localPath;
      } else {
        const scanFile = formData.get('scanFile') as File | null;
        if (!scanFile) {
          return NextResponse.json({ error: 'No scan file or local path provided' }, { status: 400 });
        }
        const ext = scanFile.name.split('.').pop() ?? 'bin';
        tmpPath = join(tmpdir(), `scan_${randomUUID()}.${ext}`);
        await writeFile(tmpPath, Buffer.from(await scanFile.arrayBuffer()));
      }

      const res = await fetch('http://localhost:4173/api/render/reality', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inputFile: tmpPath,
          outputFormat: formData.get('outputFormat') ?? 'usdz',
          optimize: formData.get('optimize') !== 'false',
          // Xcode PhotogrammetrySession.Configuration
          quality: formData.get('quality') ?? 'medium',
          featureSensitivity: formData.get('featureSensitivity') ?? 'normal',
          sampleOrdering: formData.get('sampleOrdering') ?? 'unordered',
          isObjectMaskingEnabled: formData.get('isObjectMaskingEnabled') !== 'false',
          reprocess: formData.get('reprocess') === 'true',
        }),
      }).catch(() => null);

      if (res?.ok) return NextResponse.json(await res.json());

      return NextResponse.json({
        success: true,
        outputPath: tmpPath,
        format: formData.get('outputFormat') ?? 'usdz',
        fileSize: 0,
        vertexCount: 0,
        warnings: ['LRP backend not available — connect open3d-api at port 4173'],
      });
    }

    // ── Generic LRP methods ───────────────────────────────────────────────────
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
