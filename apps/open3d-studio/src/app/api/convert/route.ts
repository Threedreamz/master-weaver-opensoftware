import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const targetFormat = formData.get('targetFormat') as string;

    if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 });

    const buffer = Buffer.from(await file.arrayBuffer());
    const ext = file.name.split('.').pop()?.toLowerCase() ?? '';

    // For now, return the raw buffer with format info
    // Full pipeline conversion requires PipelineEngine which needs node:fs context
    const { STLConverter, OBJConverter } = await import('@mw/open3d-converter');

    if (ext === 'stl' && targetFormat === 'stl') {
      const converter = new STLConverter();
      const result = await converter.convert(buffer, { outputFormat: 'stl' });
      return new NextResponse(result.output, {
        headers: { 'Content-Type': 'application/octet-stream', 'Content-Disposition': `attachment; filename="converted.${targetFormat}"` },
      });
    }

    if (ext === 'obj' && targetFormat === 'obj') {
      const converter = new OBJConverter();
      const result = await converter.convert(buffer, { outputFormat: 'obj' });
      return new NextResponse(result.output, {
        headers: { 'Content-Type': 'application/octet-stream', 'Content-Disposition': `attachment; filename="converted.${targetFormat}"` },
      });
    }

    // Pass-through for formats we can't convert yet
    return new NextResponse(buffer, {
      headers: { 'Content-Type': 'application/octet-stream', 'Content-Disposition': `attachment; filename="converted.${targetFormat}"` },
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
