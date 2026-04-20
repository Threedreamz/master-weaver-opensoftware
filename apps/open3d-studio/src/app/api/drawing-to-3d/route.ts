import { NextRequest, NextResponse } from 'next/server';

/**
 * Drawing-to-3D pipeline proxy.
 *
 * Forwards { drawingPath, aiBackend, userFeedback?, iterationId? } to the
 * open3d-api LRP universal endpoint at /api/lrp/drawing-to-3d.
 *
 * Backend: V2 — OpenCV → Shapely → trimesh extrusion with AI feedback loop.
 * When `userFeedback` + `iterationId` are supplied, the Python handler asks
 * the chosen `aiBackend` (ollama / claude / lmstudio / rule_based) for a
 * parameter-delta, merges with the prior iteration's params, and re-extracts.
 *
 * Backends:
 *   - rule_based (default, offline) — regex-parsed English+German phrasing.
 *   - ollama     — POST http://localhost:11434/api/generate (model=llama3.2).
 *   - claude     — POST Anthropic Messages API (needs ANTHROPIC_API_KEY).
 *   - lmstudio   — POST http://localhost:1234/v1/chat/completions.
 *
 * See runtimes/open3d-python/handlers/drawing_to_3d.py +
 * runtimes/open3d-python/lib/ai_backends.py.
 */
const OPEN3D_API_URL = process.env.OPEN3D_API_URL || 'http://localhost:4173';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const res = await fetch(`${OPEN3D_API_URL}/api/lrp/drawing-to-3d`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }).catch(() => null);

    if (res?.ok) {
      return NextResponse.json(await res.json());
    }

    // LRP unreachable — fall back to a synthetic placeholder so the UI doesn't break.
    return NextResponse.json({
      success: true,
      outputPath: '/tmp/placeholder.stl',
      stlPath: '/tmp/placeholder.stl',
      vertexCount: 0,
      faceCount: 0,
      warning: 'LRP backend not reachable — open3d-api on port 4173 must be running for the real pipeline.',
      method: 'drawing-to-3d-fallback',
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
