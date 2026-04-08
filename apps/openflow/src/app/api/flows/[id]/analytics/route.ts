import { NextRequest, NextResponse } from "next/server";
import { eq, and, between, sql, count } from "drizzle-orm";
import { checkApiAuth } from "@/lib/api-auth";
import { db } from "@/db";
import { flowEvents, flowSteps } from "@/db/schema";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const authError = await checkApiAuth();
    if (authError) return authError;

    const { id: flowId } = await context.params;
    const { searchParams } = new URL(request.url);

    const now = new Date();
    const defaultFrom = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const from = searchParams.get("from")
      ? new Date(searchParams.get("from")!)
      : defaultFrom;
    const to = searchParams.get("to") ? new Date(searchParams.get("to")!) : now;

    // Ensure 'to' covers the full day
    to.setHours(23, 59, 59, 999);

    const dateCondition = and(
      eq(flowEvents.flowId, flowId),
      between(flowEvents.createdAt, from, to)
    );

    // Total visits (view events)
    const visitsResult = await db
      .select({ count: count() })
      .from(flowEvents)
      .where(and(dateCondition, eq(flowEvents.type, "view")));
    const visits = visitsResult[0]?.count ?? 0;

    // Total submissions
    const submissionsResult = await db
      .select({ count: count() })
      .from(flowEvents)
      .where(and(dateCondition, eq(flowEvents.type, "submission")));
    const submissionsCount = submissionsResult[0]?.count ?? 0;

    // Completion rate
    const completionRate = visits > 0 ? Math.round((submissionsCount / visits) * 100) : 0;

    // Daily stats
    const dailyStatsRaw = await db
      .select({
        date: sql<string>`date(${flowEvents.createdAt}, 'unixepoch')`.as("date"),
        type: flowEvents.type,
        count: count(),
      })
      .from(flowEvents)
      .where(dateCondition)
      .groupBy(sql`date(${flowEvents.createdAt}, 'unixepoch')`, flowEvents.type)
      .orderBy(sql`date(${flowEvents.createdAt}, 'unixepoch')`);

    // Aggregate daily stats into { date, visits, submissions } objects
    const dailyMap = new Map<string, { date: string; visits: number; submissions: number }>();
    for (const row of dailyStatsRaw) {
      if (!dailyMap.has(row.date)) {
        dailyMap.set(row.date, { date: row.date, visits: 0, submissions: 0 });
      }
      const entry = dailyMap.get(row.date)!;
      if (row.type === "view") entry.visits = row.count;
      if (row.type === "submission") entry.submissions = row.count;
    }
    const dailyStats = Array.from(dailyMap.values());

    // Step stats
    const steps = await db
      .select({ id: flowSteps.id, label: flowSteps.label })
      .from(flowSteps)
      .where(eq(flowSteps.flowId, flowId))
      .orderBy(flowSteps.sortOrder);

    const stepViewsRaw = await db
      .select({
        stepId: flowEvents.stepId,
        type: flowEvents.type,
        count: count(),
      })
      .from(flowEvents)
      .where(
        and(
          dateCondition,
          sql`${flowEvents.stepId} IS NOT NULL`
        )
      )
      .groupBy(flowEvents.stepId, flowEvents.type);

    const stepStatsMap = new Map<string, { views: number; exits: number }>();
    for (const row of stepViewsRaw) {
      if (!row.stepId) continue;
      if (!stepStatsMap.has(row.stepId)) {
        stepStatsMap.set(row.stepId, { views: 0, exits: 0 });
      }
      const entry = stepStatsMap.get(row.stepId)!;
      if (row.type === "step_view") entry.views = row.count;
      if (row.type === "exit") entry.exits = row.count;
    }

    const stepStats = steps.map((step) => {
      const stats = stepStatsMap.get(step.id) ?? { views: 0, exits: 0 };
      return {
        stepId: step.id,
        label: step.label,
        views: stats.views,
        exits: stats.exits,
        exitRate: stats.views > 0 ? Math.round((stats.exits / stats.views) * 100) : 0,
      };
    });

    // Device stats
    const deviceStatsRaw = await db
      .select({
        device: flowEvents.device,
        count: count(),
      })
      .from(flowEvents)
      .where(and(dateCondition, eq(flowEvents.type, "view")))
      .groupBy(flowEvents.device);

    const deviceStats: Record<string, number> = { desktop: 0, mobile: 0, tablet: 0 };
    for (const row of deviceStatsRaw) {
      const key = (row.device ?? "desktop").toLowerCase();
      if (key in deviceStats) {
        deviceStats[key] = row.count;
      } else {
        deviceStats.desktop += row.count;
      }
    }

    return NextResponse.json({
      visits,
      submissions: submissionsCount,
      completionRate,
      avgDuration: 0,
      dailyStats,
      stepStats,
      deviceStats,
    });
  } catch (error) {
    console.error("[GET /api/flows/[id]/analytics]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
