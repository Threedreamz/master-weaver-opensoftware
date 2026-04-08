import { NextRequest, NextResponse } from "next/server";
import { checkApiAuth } from "@/lib/api-auth";

/**
 * In-memory presence store per flow.
 * Maps flowId → Map<sessionId, PresenceEntry>
 * Entries expire after 30 seconds without heartbeat.
 */

interface PresenceEntry {
  sessionId: string;
  userId?: string;
  userName: string;
  avatarUrl?: string;
  currentStepId?: string;
  currentComponentId?: string;
  color: string;
  lastSeen: number; // unix ms
}

const presenceStore = new Map<string, Map<string, PresenceEntry>>();

const PRESENCE_TTL_MS = 30_000;

const COLORS = [
  "#4C5FD5", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6",
  "#EC4899", "#06B6D4", "#84CC16", "#F97316", "#6366F1",
];

function getFlowPresence(flowId: string): PresenceEntry[] {
  const now = Date.now();
  const map = presenceStore.get(flowId);
  if (!map) return [];
  // Evict stale entries
  for (const [sid, entry] of map.entries()) {
    if (now - entry.lastSeen > PRESENCE_TTL_MS) map.delete(sid);
  }
  return Array.from(map.values());
}

function assignColor(flowId: string, sessionId: string): string {
  const map = presenceStore.get(flowId);
  const usedColors = new Set(map ? Array.from(map.values()).map((e) => e.color) : []);
  return COLORS.find((c) => !usedColors.has(c)) ?? COLORS[Math.floor(Math.random() * COLORS.length)];
}

/**
 * GET /api/flows/[id]/presence
 * Returns current presence list. Clients poll every 5s.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authError = await checkApiAuth();
    if (authError) return authError;

    const { id } = await params;
    return NextResponse.json(getFlowPresence(id));
  } catch (error) {
    console.error("[GET /api/flows/[id]/presence]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * POST /api/flows/[id]/presence
 * Heartbeat: client sends its presence data every 10s.
 * Body: { sessionId, userId?, userName, avatarUrl?, currentStepId?, currentComponentId? }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authError = await checkApiAuth();
    if (authError) return authError;

    const { id } = await params;
    const body = await request.json();
    const { sessionId, userId, userName, avatarUrl, currentStepId, currentComponentId } = body;

    if (!sessionId || !userName) {
      return NextResponse.json({ error: "sessionId and userName required" }, { status: 400 });
    }

    if (!presenceStore.has(id)) presenceStore.set(id, new Map());
    const map = presenceStore.get(id)!;

    const existing = map.get(sessionId);
    const color = existing?.color ?? assignColor(id, sessionId);

    map.set(sessionId, {
      sessionId,
      userId,
      userName,
      avatarUrl,
      currentStepId,
      currentComponentId,
      color,
      lastSeen: Date.now(),
    });

    return NextResponse.json({ ok: true, color });
  } catch (error) {
    console.error("[POST /api/flows/[id]/presence]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * DELETE /api/flows/[id]/presence
 * Remove self from presence (on disconnect).
 * Body: { sessionId }
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const { sessionId } = body;
    if (sessionId) {
      presenceStore.get(id)?.delete(sessionId);
    }
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("[DELETE /api/flows/[id]/presence]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
