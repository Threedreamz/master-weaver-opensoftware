import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/export
 * Body: { inputPath: string, outputFormat: 'stl' | 'obj' | 'ply' | 'step' | 'iges' }
 *
 * Routes to:
 *  - STL / OBJ / PLY / GLB → convert-mesh (trimesh)
 *  - STEP / IGES            → scan-to-step (pythonOCC primitive fitting)
 */
export async function POST(request: NextRequest) {
  try {
    const { inputPath, outputFormat } = await request.json();

    if (!inputPath || !outputFormat) {
      return NextResponse.json({ error: 'inputPath and outputFormat required' }, { status: 400 });
    }

    const fmt = outputFormat.toLowerCase();
    const isCAD = fmt === 'step' || fmt === 'iges';

    let result: Record<string, any>;

    if (isCAD) {
      // scan-to-step: converts mesh/point-cloud → STEP via B-Rep primitive fitting
      const res = await fetch('http://localhost:4173/api/lrp/scan-to-step', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scanPath: inputPath,
          outputFormat: fmt,
          outlierRemoval: true,
          downsampleVoxelSize: 1.0,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      result = await res.json();
      // scan-to-step returns stepPath, normalise to outputPath
      if (result.stepPath) result.outputPath = result.stepPath;
    } else {
      // convert-mesh: STL, OBJ, PLY, GLB, etc.
      const res = await fetch('http://localhost:4173/api/lrp/convert-mesh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inputPath, outputFormat: fmt }),
      });
      if (!res.ok) throw new Error(await res.text());
      result = await res.json();
    }

    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
