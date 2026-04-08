"use server";

import { db } from "@/db";
import { deskWorkflows, deskWorkflowSteps } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function createWorkflow(formData: FormData) {
  const name = formData.get("name") as string;
  const description = formData.get("description") as string | null;
  const workstationType = formData.get("workstationType") as string | null;
  const status = formData.get("status") as string | null;
  const locale = (formData.get("locale") as string) || "de";

  if (!name) {
    throw new Error("Name is required");
  }

  const [workflow] = await db
    .insert(deskWorkflows)
    .values({
      name,
      description: description || null,
      workstationType: (workstationType as "scanning" | "cad" | "printing" | "quality_check" | "packaging" | "assembly" | "office" | "general" | "any") || "any",
      status: (status as "draft" | "active" | "archived") || "draft",
      version: 1,
    })
    .returning();

  revalidatePath(`/${locale}/admin/workflows`);
  redirect(`/${locale}/admin/workflows/${workflow.id}`);
}

export async function deleteWorkflow(formData: FormData) {
  const id = formData.get("id") as string;
  const locale = (formData.get("locale") as string) || "de";

  if (!id) return;

  await db.delete(deskWorkflows).where(eq(deskWorkflows.id, id));

  revalidatePath(`/${locale}/admin/workflows`);
  redirect(`/${locale}/admin/workflows`);
}

export async function createWorkflowStep(formData: FormData) {
  const workflowId = formData.get("workflowId") as string;
  const name = formData.get("name") as string;
  const type = formData.get("type") as string | null;
  const sortOrder = formData.get("sortOrder") ? Number(formData.get("sortOrder")) : 0;
  const estimatedMinutes = formData.get("estimatedMinutes") ? Number(formData.get("estimatedMinutes")) : null;
  const description = formData.get("description") as string | null;
  const integrationApp = formData.get("integrationApp") as string | null;
  const integrationAction = formData.get("integrationAction") as string | null;
  const locale = (formData.get("locale") as string) || "de";

  if (!workflowId || !name) {
    throw new Error("workflowId and name are required");
  }

  await db.insert(deskWorkflowSteps).values({
    workflowId,
    name,
    type: (type as "manual" | "automated" | "approval" | "checkpoint" | "integration") || "manual",
    sortOrder,
    estimatedMinutes: estimatedMinutes ?? null,
    description: description || null,
    integrationApp: integrationApp || null,
    integrationAction: integrationAction || null,
  });

  revalidatePath(`/${locale}/admin/workflows/${workflowId}`);
  redirect(`/${locale}/admin/workflows/${workflowId}`);
}

export async function deleteWorkflowStep(formData: FormData) {
  const id = formData.get("id") as string;
  const workflowId = formData.get("workflowId") as string;
  const locale = (formData.get("locale") as string) || "de";

  if (!id) return;

  await db.delete(deskWorkflowSteps).where(eq(deskWorkflowSteps.id, id));

  revalidatePath(`/${locale}/admin/workflows/${workflowId}`);
  redirect(`/${locale}/admin/workflows/${workflowId}`);
}

export async function activateWorkflow(formData: FormData) {
  const id = formData.get("id") as string;
  const locale = (formData.get("locale") as string) || "de";

  if (!id) return;

  await db
    .update(deskWorkflows)
    .set({ status: "active" })
    .where(eq(deskWorkflows.id, id));

  revalidatePath(`/${locale}/admin/workflows`);
  revalidatePath(`/${locale}/admin/workflows/${id}`);
  redirect(`/${locale}/admin/workflows/${id}`);
}
