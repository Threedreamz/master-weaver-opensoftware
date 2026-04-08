import { NextResponse } from "next/server";
import { runAllCountryAgents, runCountryAgent } from "@/lib/market-map/country-agent";

// In-memory run tracking (will be replaced with DB in production)
const activeRuns = new Map<string, {
  status: "running" | "completed" | "failed";
  total: number;
  completed: number;
  failed: number;
  results: Record<string, unknown>;
  startedAt: string;
  completedAt?: string;
}>();

let runCounter = 0;

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const scope: string = body.scope ?? "all";

  const runId = `run-${++runCounter}-${Date.now()}`;

  if (scope === "all") {
    activeRuns.set(runId, {
      status: "running",
      total: 27,
      completed: 0,
      failed: 0,
      results: {},
      startedAt: new Date().toISOString(),
    });

    // Run async — don't block the response
    runAllCountryAgents({
      maxConcurrent: 5,
      onProgress: (code, result) => {
        const run = activeRuns.get(runId);
        if (run) {
          if (result.success) run.completed++;
          else run.failed++;
          run.results[code] = {
            success: result.success,
            smeCount: result.countryData?.smeCount,
            marketScore: result.countryData?.marketScore,
            source: result.source,
            duration: result.duration,
          };
        }
      },
    }).then(() => {
      const run = activeRuns.get(runId);
      if (run) {
        run.status = "completed";
        run.completedAt = new Date().toISOString();
      }
    }).catch(() => {
      const run = activeRuns.get(runId);
      if (run) run.status = "failed";
    });

    return NextResponse.json({ runId, status: "started", total: 27 });
  }

  // Single country
  if (scope.startsWith("country:")) {
    const code = scope.split(":")[1].toUpperCase();
    const result = await runCountryAgent(code);
    return NextResponse.json(result);
  }

  return NextResponse.json({ error: "Invalid scope. Use 'all' or 'country:XX'" }, { status: 400 });
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const runId = searchParams.get("runId");

  if (!runId) {
    return NextResponse.json({
      activeRuns: Array.from(activeRuns.entries()).map(([id, run]) => ({
        runId: id,
        status: run.status,
        progress: `${run.completed}/${run.total}`,
        startedAt: run.startedAt,
      })),
    });
  }

  const run = activeRuns.get(runId);
  if (!run) {
    return NextResponse.json({ error: "Run not found" }, { status: 404 });
  }

  return NextResponse.json({
    runId,
    ...run,
    progress: `${run.completed + run.failed}/${run.total}`,
  });
}
