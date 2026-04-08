"use server";

import { db } from "@/db";
import {
  deskFlows,
  deskFlowNodes,
  deskFlowEdges,
} from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

// ==================== FLOW CRUD ====================

export async function createFlow(formData: FormData) {
  const name = formData.get("name") as string;
  const description = formData.get("description") as string | null;
  const locale = (formData.get("locale") as string) || "de";

  if (!name?.trim()) {
    throw new Error("Name is required");
  }

  const result = await db
    .insert(deskFlows)
    .values({
      name: name.trim(),
      description: description?.trim() || null,
      status: "draft",
      version: 1,
    })
    .returning({ id: deskFlows.id });

  const id = result[0]?.id;
  revalidatePath(`/${locale}/admin/flows`);
  redirect(`/${locale}/admin/flows/${id}`);
}

export async function deleteFlow(formData: FormData) {
  const id = formData.get("id") as string;
  const locale = (formData.get("locale") as string) || "de";
  if (!id) return;

  await db.delete(deskFlows).where(eq(deskFlows.id, id));
  revalidatePath(`/${locale}/admin/flows`);
  redirect(`/${locale}/admin/flows`);
}

export async function publishFlow(formData: FormData) {
  const id = formData.get("id") as string;
  const locale = (formData.get("locale") as string) || "de";
  if (!id) return;

  const existing = await db.query.deskFlows.findFirst({
    where: eq(deskFlows.id, id),
  });
  if (!existing) return;

  await db
    .update(deskFlows)
    .set({
      status: "live",
      publishedAt: new Date(),
      version: existing.version + 1,
      updatedAt: new Date(),
    })
    .where(eq(deskFlows.id, id));

  revalidatePath(`/${locale}/admin/flows`);
  revalidatePath(`/${locale}/admin/flows/${id}`);
  redirect(`/${locale}/admin/flows/${id}`);
}

export async function archiveFlow(formData: FormData) {
  const id = formData.get("id") as string;
  const locale = (formData.get("locale") as string) || "de";
  if (!id) return;

  await db
    .update(deskFlows)
    .set({ status: "archived", updatedAt: new Date() })
    .where(eq(deskFlows.id, id));

  revalidatePath(`/${locale}/admin/flows`);
  revalidatePath(`/${locale}/admin/flows/${id}`);
  redirect(`/${locale}/admin/flows/${id}`);
}

// ==================== NODE CRUD ====================

export async function addFlowNode(formData: FormData) {
  const flowId = formData.get("flowId") as string;
  const moduleId = formData.get("moduleId") as string;
  const label = formData.get("label") as string | null;
  const positionX = formData.get("positionX") ? Number(formData.get("positionX")) : 100;
  const positionY = formData.get("positionY") ? Number(formData.get("positionY")) : 100;
  const isStart = formData.get("isStart") === "on" || formData.get("isStart") === "true";
  const isEnd = formData.get("isEnd") === "on" || formData.get("isEnd") === "true";
  const locale = (formData.get("locale") as string) || "de";

  if (!flowId || !moduleId) {
    throw new Error("flowId and moduleId are required");
  }

  await db.insert(deskFlowNodes).values({
    flowId,
    moduleId,
    label: label?.trim() || null,
    positionX,
    positionY,
    isStart,
    isEnd,
  });

  revalidatePath(`/${locale}/admin/flows/${flowId}`);
}

export async function updateFlowNode(formData: FormData) {
  const id = formData.get("id") as string;
  const positionX = formData.get("positionX") ? Number(formData.get("positionX")) : undefined;
  const positionY = formData.get("positionY") ? Number(formData.get("positionY")) : undefined;
  const label = formData.get("label") as string | null;
  const isStart = formData.get("isStart") === "on" || formData.get("isStart") === "true";
  const isEnd = formData.get("isEnd") === "on" || formData.get("isEnd") === "true";
  const flowId = formData.get("flowId") as string | null;
  const locale = (formData.get("locale") as string) || "de";

  if (!id) return;

  const updates: Partial<{
    positionX: number;
    positionY: number;
    label: string | null;
    isStart: boolean;
    isEnd: boolean;
  }> = {};

  if (positionX !== undefined) updates.positionX = positionX;
  if (positionY !== undefined) updates.positionY = positionY;
  if (formData.has("label")) updates.label = label?.trim() || null;
  if (formData.has("isStart")) updates.isStart = isStart;
  if (formData.has("isEnd")) updates.isEnd = isEnd;

  if (Object.keys(updates).length > 0) {
    await db.update(deskFlowNodes).set(updates).where(eq(deskFlowNodes.id, id));
  }

  if (flowId) {
    revalidatePath(`/${locale}/admin/flows/${flowId}`);
  }
}

export async function deleteFlowNode(formData: FormData) {
  const id = formData.get("id") as string;
  const flowId = formData.get("flowId") as string;
  const locale = (formData.get("locale") as string) || "de";
  if (!id) return;

  await db.delete(deskFlowNodes).where(eq(deskFlowNodes.id, id));

  if (flowId) {
    revalidatePath(`/${locale}/admin/flows/${flowId}`);
    redirect(`/${locale}/admin/flows/${flowId}`);
  }
}

// ==================== EDGE CRUD ====================

export async function addFlowEdge(formData: FormData) {
  const flowId = formData.get("flowId") as string;
  const fromNodeId = formData.get("fromNodeId") as string;
  const toNodeId = formData.get("toNodeId") as string;
  const label = formData.get("label") as string | null;
  const conditionRaw = formData.get("condition") as string | null;
  const priority = formData.get("priority") ? Number(formData.get("priority")) : 0;
  const locale = (formData.get("locale") as string) || "de";

  if (!flowId || !fromNodeId || !toNodeId) {
    throw new Error("flowId, fromNodeId, and toNodeId are required");
  }

  let condition: Record<string, unknown> | null = null;
  if (conditionRaw?.trim()) {
    try {
      condition = JSON.parse(conditionRaw.trim());
    } catch {
      condition = null;
    }
  }

  await db.insert(deskFlowEdges).values({
    flowId,
    fromNodeId,
    toNodeId,
    label: label?.trim() || null,
    condition,
    priority,
  });

  revalidatePath(`/${locale}/admin/flows/${flowId}`);
}

export async function updateFlowEdge(formData: FormData) {
  const id = formData.get("id") as string;
  const flowId = formData.get("flowId") as string;
  const label = formData.get("label") as string | null;
  const conditionRaw = formData.get("condition") as string | null;
  const priority = formData.get("priority") ? Number(formData.get("priority")) : undefined;
  const locale = (formData.get("locale") as string) || "de";

  if (!id) return;

  const updates: Partial<{
    label: string | null;
    condition: Record<string, unknown> | null;
    priority: number;
  }> = {};

  if (formData.has("label")) updates.label = label?.trim() || null;
  if (conditionRaw !== null) {
    try {
      updates.condition = conditionRaw.trim() ? JSON.parse(conditionRaw.trim()) : null;
    } catch {
      updates.condition = null;
    }
  }
  if (priority !== undefined) updates.priority = priority;

  if (Object.keys(updates).length > 0) {
    await db.update(deskFlowEdges).set(updates).where(eq(deskFlowEdges.id, id));
  }

  if (flowId) {
    revalidatePath(`/${locale}/admin/flows/${flowId}`);
  }
}

export async function deleteFlowEdge(formData: FormData) {
  const id = formData.get("id") as string;
  const flowId = formData.get("flowId") as string;
  const locale = (formData.get("locale") as string) || "de";
  if (!id) return;

  await db.delete(deskFlowEdges).where(eq(deskFlowEdges.id, id));

  if (flowId) {
    revalidatePath(`/${locale}/admin/flows/${flowId}`);
  }
}

export async function saveFlowLayout(formData: FormData) {
  const nodesJson = formData.get("nodes") as string;
  const locale = (formData.get("locale") as string) || "de";
  const flowId = formData.get("flowId") as string;

  if (!nodesJson) return;

  let nodes: Array<{ id: string; positionX: number; positionY: number }>;
  try {
    nodes = JSON.parse(nodesJson);
  } catch {
    return;
  }

  for (const node of nodes) {
    if (!node.id) continue;
    await db
      .update(deskFlowNodes)
      .set({ positionX: node.positionX, positionY: node.positionY })
      .where(eq(deskFlowNodes.id, node.id));
  }

  if (flowId) {
    revalidatePath(`/${locale}/admin/flows/${flowId}`);
  }
}
