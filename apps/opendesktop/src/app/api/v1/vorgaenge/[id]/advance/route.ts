import { NextRequest, NextResponse } from "next/server";
import { advanceVorgang } from "@/lib/flow-engine";

function authenticate(req: NextRequest): boolean {
  const apiKey = process.env.OPENDESKTOP_API_KEY;
  if (!apiKey) return true;
  const auth = req.headers.get("authorization");
  return auth === `Bearer ${apiKey}`;
}

/**
 * POST /api/v1/vorgaenge/:id/advance
 * Advance a Vorgang to the next flow node.
 * Body: { userId? }
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!authenticate(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    // body is optional
  }

  const userId = (body.userId as string) || "api";
  const result = await advanceVorgang(id, userId);

  if (!result.success) {
    return NextResponse.json({ error: result.message }, { status: 400 });
  }

  return NextResponse.json({ data: result });
}
