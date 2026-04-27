export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { db, schema } from "@/db";
import { eq } from "drizzle-orm";
import { requireSessionOrApiKey } from "@/lib/auth-helpers";
import { runCleaning } from "@/lib/emulators/cleaning";

const CleaningBody = z.object({
  partId: z.string().min(1),
  strategy: z.string().min(1),
  mode: z.string().min(1),
  projectId: z.string().optional(),
});

/* POST /api/solve/cleaning — session-or-api-key */
export async function POST(req: NextRequest) {
  const auth = await requireSessionOrApiKey(req);
  if (auth instanceof NextResponse) return auth;

  const raw = await req.json().catch(() => null);
  const parsed = CleaningBody.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid body", details: parsed.error.issues },
      { status: 400 },
    );
  }

  const started = Date.now();
  try {
    const result = runCleaning({
      partId: parsed.data.partId,
      strategy: parsed.data.strategy,
      mode: parsed.data.mode,
    });

    let runId = "";
    if (parsed.data.projectId) {
      const [row] = await db
        .insert(schema.opensimulationRuns)
        .values({
          projectId: parsed.data.projectId,
          domain: "cleaning",
          status: "done",
          triggeredBy: auth.via === "api-key" ? "api-key" : "session",
          inputJson: parsed.data,
          resultJson: result as unknown as Record<string, unknown>,
          durationMs: Date.now() - started,
        })
        .returning({ id: schema.opensimulationRuns.id })
        .catch(() => [{ id: "" }]);
      runId = row?.id || "";
    }

    return NextResponse.json({ ...result, runId });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: "Emulator failed", details: { message } },
      { status: 500 },
    );
  }
}
