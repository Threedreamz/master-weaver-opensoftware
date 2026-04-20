import { NextRequest, NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { randomUUID } from 'crypto';

/**
 * Uploads a technical drawing (PNG/JPG/PDF/SVG/BMP) to a temp file.
 * The pipeline route then sends `drawingPath` to the LRP handler.
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('drawing') as File | null;
    if (!file) {
      return NextResponse.json({ error: 'No drawing file provided (expected field "drawing")' }, { status: 400 });
    }

    const ext = file.name.includes('.') ? file.name.split('.').pop() : 'bin';
    const drawingPath = join(tmpdir(), `drawing_${randomUUID()}.${ext}`);
    await writeFile(drawingPath, Buffer.from(await file.arrayBuffer()));

    return NextResponse.json({ drawingPath, originalName: file.name, size: file.size });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
