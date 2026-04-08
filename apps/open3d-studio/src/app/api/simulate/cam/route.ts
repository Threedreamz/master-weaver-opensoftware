import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const res = await fetch('http://localhost:4173/api/lrp/cam-toolpath', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    }).catch(() => null);
    if (res?.ok) return NextResponse.json(await res.json());
    // Basic G-code fallback
    const gcode = `; Open3D CAM - Basic surfacing\nG21\nG90\nG28\nS12000 M3\nG0 Z10\nG1 Z0 F200\nG1 X100 F800\nG0 Z10\nM5\nG28\nM2`;
    return NextResponse.json({
      gcode, estimatedTime: 120, toolpathLength: 100,
      success: true, warnings: ['LRP backend not available — placeholder G-code'],
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
