import { eq, desc, and, like, sql } from "drizzle-orm";
import { db } from "../index";
import { flows, flowSteps, stepComponents, flowEdges, flowVersions, submissions } from "../schema";

export async function getFlows(options?: { status?: string; search?: string; limit?: number; offset?: number }) {
  const conditions = [];
  if (options?.status) conditions.push(eq(flows.status, options.status as "draft" | "published" | "archived"));
  if (options?.search) conditions.push(like(flows.name, `%${options.search}%`));

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  return db.query.flows.findMany({
    where,
    orderBy: [desc(flows.updatedAt)],
    limit: options?.limit ?? 50,
    offset: options?.offset ?? 0,
  });
}

export async function getFlowsWithFirstStep(options?: { status?: string; search?: string; limit?: number; offset?: number }) {
  const conditions = [];
  if (options?.status) conditions.push(eq(flows.status, options.status as "draft" | "published" | "archived"));
  if (options?.search) conditions.push(like(flows.name, `%${options.search}%`));

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  return db.query.flows.findMany({
    where,
    orderBy: [desc(flows.updatedAt)],
    limit: options?.limit ?? 50,
    offset: options?.offset ?? 0,
    with: {
      steps: {
        orderBy: [flowSteps.sortOrder],
        with: {
          components: {
            orderBy: [stepComponents.sortOrder],
          },
        },
      },
    },
  });
}

export async function getFlowById(id: string) {
  return db.query.flows.findFirst({
    where: eq(flows.id, id),
    with: {
      steps: {
        orderBy: [flowSteps.sortOrder],
        with: {
          components: {
            orderBy: [stepComponents.sortOrder],
          },
        },
      },
      edges: true,
    },
  });
}

export async function getFlowBySlug(slug: string) {
  return db.query.flows.findFirst({
    where: eq(flows.slug, slug),
    with: {
      steps: {
        orderBy: [flowSteps.sortOrder],
        with: {
          components: {
            orderBy: [stepComponents.sortOrder],
          },
        },
      },
      edges: true,
    },
  });
}

export async function createFlow(data: { name: string; slug: string; description?: string; settings?: string; createdBy?: string; aiPlan?: string; aiBriefing?: string }) {
  const [flow] = await db.insert(flows).values(data).returning();
  return flow;
}

export async function updateFlow(id: string, data: Partial<{ name: string; slug: string; description: string; status: "draft" | "published" | "archived"; settings: string; aiPlan: string | null; aiBriefing: string | null }>) {
  const [flow] = await db.update(flows)
    .set({ ...data, updatedAt: sql`(unixepoch())` })
    .where(eq(flows.id, id))
    .returning();
  return flow;
}

export async function deleteFlow(id: string) {
  await db.delete(flows).where(eq(flows.id, id));
}

export async function getFlowStats(flowId: string) {
  const stepCount = await db.select({ count: sql<number>`count(*)` }).from(flowSteps).where(eq(flowSteps.flowId, flowId));
  const submissionCount = await db.select({ count: sql<number>`count(*)` }).from(submissions).where(eq(submissions.flowId, flowId));
  const completedCount = await db.select({ count: sql<number>`count(*)` }).from(submissions).where(and(eq(submissions.flowId, flowId), eq(submissions.status, "completed")));

  return {
    steps: stepCount[0]?.count ?? 0,
    submissions: submissionCount[0]?.count ?? 0,
    completed: completedCount[0]?.count ?? 0,
    completionRate: submissionCount[0]?.count ? Math.round((completedCount[0]?.count ?? 0) / submissionCount[0].count * 100) : 0,
  };
}

export async function publishFlow(flowId: string, publishedBy?: string) {
  const flow = await getFlowById(flowId);
  if (!flow) throw new Error("Flow not found");

  // Get next version number
  const latestVersion = await db.query.flowVersions.findFirst({
    where: eq(flowVersions.flowId, flowId),
    orderBy: [desc(flowVersions.version)],
  });

  const nextVersion = (latestVersion?.version ?? 0) + 1;

  // Create version snapshot
  const snapshot = JSON.stringify({
    steps: flow.steps,
    edges: flow.edges,
    settings: flow.settings,
    startStepId: flow.steps.find(s => s.type === "start")?.id,
  });

  await db.insert(flowVersions).values({
    flowId,
    version: nextVersion,
    snapshot,
    publishedBy,
  });

  // Update flow status
  await updateFlow(flowId, { status: "published" });

  return { version: nextVersion };
}
