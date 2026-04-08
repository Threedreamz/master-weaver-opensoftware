import { eq, desc, and, sql, ne } from "drizzle-orm";
import { db } from "../index";
import { flowComments, flows, assets, assetReferences, qaFindings, aiJobs, flowEdits, users } from "../schema";
import type { UserRole } from "../schema";

// ─── Comments ────────────────────────────────────────────────────────────────

export async function getFlowComments(flowId: string) {
  return db.query.flowComments.findMany({
    where: eq(flowComments.flowId, flowId),
    orderBy: [desc(flowComments.createdAt)],
  });
}

export async function createComment(data: {
  flowId: string;
  stepId?: string;
  componentId?: string;
  authorId?: string;
  authorName: string;
  authorAvatar?: string;
  content: string;
}) {
  const [comment] = await db.insert(flowComments).values(data).returning();
  return comment;
}

export async function resolveComment(id: string, resolvedBy: string) {
  const [comment] = await db
    .update(flowComments)
    .set({ resolved: true, resolvedBy, resolvedAt: sql`(unixepoch())`, updatedAt: sql`(unixepoch())` })
    .where(eq(flowComments.id, id))
    .returning();
  return comment;
}

export async function reopenComment(id: string) {
  const [comment] = await db
    .update(flowComments)
    .set({ resolved: false, resolvedBy: null, resolvedAt: null, updatedAt: sql`(unixepoch())` })
    .where(eq(flowComments.id, id))
    .returning();
  return comment;
}

export async function deleteComment(id: string) {
  await db.delete(flowComments).where(eq(flowComments.id, id));
}

// ─── Review Workflow ──────────────────────────────────────────────────────────

export async function submitForReview(flowId: string) {
  const [flow] = await db
    .update(flows)
    .set({ reviewStatus: "in_review", updatedAt: sql`(unixepoch())` })
    .where(eq(flows.id, flowId))
    .returning();
  return flow;
}

export async function approveFlow(flowId: string, reviewedBy: string, notes?: string) {
  const [flow] = await db
    .update(flows)
    .set({
      reviewStatus: "approved",
      reviewedBy,
      reviewNotes: notes ?? null,
      reviewedAt: sql`(unixepoch())`,
      updatedAt: sql`(unixepoch())`,
    })
    .where(eq(flows.id, flowId))
    .returning();
  return flow;
}

export async function rejectFlow(flowId: string, reviewedBy: string, notes: string) {
  const [flow] = await db
    .update(flows)
    .set({
      reviewStatus: "rejected",
      reviewedBy,
      reviewNotes: notes,
      reviewedAt: sql`(unixepoch())`,
      updatedAt: sql`(unixepoch())`,
    })
    .where(eq(flows.id, flowId))
    .returning();
  return flow;
}

export async function resetReviewStatus(flowId: string) {
  const [flow] = await db
    .update(flows)
    .set({ reviewStatus: "none", reviewNotes: null, reviewedBy: null, reviewedAt: null, updatedAt: sql`(unixepoch())` })
    .where(eq(flows.id, flowId))
    .returning();
  return flow;
}

// ─── Assets ───────────────────────────────────────────────────────────────────

export async function getAssets(options?: { type?: string; limit?: number; offset?: number }) {
  const conditions = [];
  if (options?.type) conditions.push(eq(assets.type, options.type as "image" | "icon" | "video" | "document" | "other"));

  return db.query.assets.findMany({
    where: conditions.length > 0 ? and(...conditions) : undefined,
    orderBy: [desc(assets.createdAt)],
    limit: options?.limit ?? 50,
    offset: options?.offset ?? 0,
    with: { references: true },
  });
}

export async function getAssetById(id: string) {
  return db.query.assets.findFirst({
    where: eq(assets.id, id),
    with: { references: true },
  });
}

export async function createAsset(data: {
  name: string;
  url: string;
  type?: "image" | "icon" | "video" | "document" | "other";
  mimeType?: string;
  sizeBytes?: number;
  width?: number;
  height?: number;
  altText?: string;
  uploadedBy?: string;
}) {
  const [asset] = await db.insert(assets).values(data).returning();
  return asset;
}

export async function deleteAsset(id: string) {
  await db.delete(assets).where(eq(assets.id, id));
}

export async function getAssetUsage(assetId: string) {
  return db.query.assetReferences.findMany({
    where: eq(assetReferences.assetId, assetId),
  });
}

export async function upsertAssetReference(data: {
  assetId: string;
  flowId: string;
  stepId?: string;
  componentId?: string;
  fieldKey?: string;
}) {
  const existing = await db.query.assetReferences.findFirst({
    where: and(
      eq(assetReferences.assetId, data.assetId),
      eq(assetReferences.flowId, data.flowId),
      data.componentId ? eq(assetReferences.componentId, data.componentId) : sql`component_id IS NULL`
    ),
  });
  if (existing) return existing;
  const [ref] = await db.insert(assetReferences).values(data).returning();
  return ref;
}

export async function removeAssetReferencesForFlow(flowId: string) {
  await db.delete(assetReferences).where(eq(assetReferences.flowId, flowId));
}

// ─── QA Findings ──────────────────────────────────────────────────────────────

export async function getQAFindings(flowId: string) {
  return db.query.qaFindings.findMany({
    where: and(eq(qaFindings.flowId, flowId), eq(qaFindings.dismissed, false)),
    orderBy: [qaFindings.severity, qaFindings.category],
  });
}

export async function replaceQAFindings(
  flowId: string,
  findings: Array<{
    stepId?: string;
    componentId?: string;
    category: "color" | "typography" | "spacing" | "theme" | "accessibility" | "structure";
    severity: "error" | "warning" | "info";
    message: string;
    suggestion?: string;
  }>
) {
  // Delete old non-dismissed findings and insert fresh ones
  await db.delete(qaFindings).where(and(eq(qaFindings.flowId, flowId), eq(qaFindings.dismissed, false)));
  if (findings.length === 0) return [];
  const rows = findings.map((f) => ({ ...f, flowId }));
  return db.insert(qaFindings).values(rows).returning();
}

export async function dismissQAFinding(id: string) {
  const [finding] = await db
    .update(qaFindings)
    .set({ dismissed: true })
    .where(eq(qaFindings.id, id))
    .returning();
  return finding;
}

// ─── AI Jobs ──────────────────────────────────────────────────────────────────

export async function createAIJob(data: {
  flowId?: string;
  type: "generate_flow" | "suggest_content" | "optimize_step";
  input: string;
  createdBy?: string;
}) {
  const [job] = await db.insert(aiJobs).values({ ...data, status: "running" }).returning();
  return job;
}

export async function completeAIJob(id: string, output: string) {
  const [job] = await db
    .update(aiJobs)
    .set({ status: "completed", output, completedAt: sql`(unixepoch())` })
    .where(eq(aiJobs.id, id))
    .returning();
  return job;
}

export async function failAIJob(id: string, error: string) {
  const [job] = await db
    .update(aiJobs)
    .set({ status: "failed", error, completedAt: sql`(unixepoch())` })
    .where(eq(aiJobs.id, id))
    .returning();
  return job;
}

export async function getAIJobsByFlow(flowId: string) {
  return db.query.aiJobs.findMany({
    where: eq(aiJobs.flowId, flowId),
    orderBy: [desc(aiJobs.createdAt)],
    limit: 20,
  });
}

// ─── Users / Roles Management ────────────────────────────────────────────────

export async function getAllUsers() {
  return db.query.users.findMany({
    columns: {
      id: true,
      email: true,
      name: true,
      displayName: true,
      role: true,
      image: true,
      avatarUrl: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: [desc(users.createdAt)],
  });
}

export async function updateUserRole(userId: string, role: UserRole) {
  const [user] = await db
    .update(users)
    .set({ role, updatedAt: sql`(unixepoch())` })
    .where(eq(users.id, userId))
    .returning();
  return user;
}

// ─── Audit Trail (Flow Edits) ────────────────────────────────────────────────

export async function recordFlowEdit(data: {
  flowId: string;
  userId: string;
  userName?: string;
  userAvatar?: string;
  action: "created" | "edited" | "published" | "reviewed" | "deleted" | "settings_changed";
  summary?: string;
}) {
  const [edit] = await db.insert(flowEdits).values(data).returning();
  // Also update lastEditedBy on the flow
  await db
    .update(flows)
    .set({ lastEditedBy: data.userId, lastEditedAt: sql`(unixepoch())`, updatedAt: sql`(unixepoch())` })
    .where(eq(flows.id, data.flowId));
  return edit;
}

export async function getFlowEditHistory(flowId: string, limit = 50) {
  return db.query.flowEdits.findMany({
    where: eq(flowEdits.flowId, flowId),
    orderBy: [desc(flowEdits.createdAt)],
    limit,
  });
}

export async function getFlowContributors(flowId: string) {
  // Get distinct users who edited this flow
  const edits = await db
    .selectDistinct({ userId: flowEdits.userId, userName: flowEdits.userName, userAvatar: flowEdits.userAvatar })
    .from(flowEdits)
    .where(eq(flowEdits.flowId, flowId));
  return edits;
}

export async function getRecentActivity(limit = 20) {
  return db.query.flowEdits.findMany({
    orderBy: [desc(flowEdits.createdAt)],
    limit,
  });
}
