import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const res = await fetch('http://localhost:4173/api/lrp/fea-stress-analysis', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    }).catch(() => null);
    if (res?.ok) return NextResponse.json(await res.json());
    // Rough estimation fallback
    const force = body.loads?.[0]?.magnitude ?? 100;
    const E = body.material?.youngsModulus ?? 210e9;
    const stress = force / 0.001;
    return NextResponse.json({
      maxStress: stress, maxDisplacement: (force * 0.1) / (0.001 * E) * 1000,
      safetyFactor: Math.min((body.material?.yieldStrength ?? 250e6) / Math.max(stress, 1), 99),
      success: true, warnings: ['LRP backend not available — rough estimation only'],
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
