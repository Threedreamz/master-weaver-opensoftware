"use server";

import { db } from "@/db";
import { deskTasks } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function createTask(formData: FormData) {
  const title = formData.get("title") as string;
  const vorgangId = formData.get("vorgangId") as string | null;
  const moduleId = formData.get("moduleId") as string | null;
  const description = formData.get("description") as string | null;
  const assignedTo = formData.get("assignedTo") as string | null;
  const deadlineRaw = formData.get("deadline") as string | null;
  const priority = (formData.get("priority") as "low" | "medium" | "high" | "critical") || "medium";
  const blocksAdvance = formData.get("blocksAdvance") === "on";
  const locale = (formData.get("locale") as string) || "de";

  if (!title) {
    throw new Error("Title is required");
  }

  const deadline = deadlineRaw ? new Date(deadlineRaw) : null;

  await db.insert(deskTasks).values({
    title,
    vorgangId: vorgangId || null,
    moduleId: moduleId || null,
    description: description || null,
    assignedTo: assignedTo || null,
    deadline: deadline ?? undefined,
    priority,
    blocksAdvance,
    status: "offen",
  });

  revalidatePath(`/${locale}/admin/tasks`);
  if (vorgangId) {
    revalidatePath(`/${locale}/admin/vorgaenge/${vorgangId}`);
  }
  redirect(`/${locale}/admin/tasks`);
}

export async function updateTaskStatus(formData: FormData) {
  const id = formData.get("id") as string;
  const status = formData.get("status") as
    | "offen"
    | "in_bearbeitung"
    | "erledigt"
    | "storniert";
  const locale = (formData.get("locale") as string) || "de";

  if (!id || !status) return;

  await db
    .update(deskTasks)
    .set({ status, updatedAt: new Date() })
    .where(eq(deskTasks.id, id));

  revalidatePath(`/${locale}/admin/tasks`);
  redirect(`/${locale}/admin/tasks`);
}

export async function deleteTask(formData: FormData) {
  const id = formData.get("id") as string;
  const locale = (formData.get("locale") as string) || "de";
  if (!id) return;

  await db.delete(deskTasks).where(eq(deskTasks.id, id));
  revalidatePath(`/${locale}/admin/tasks`);
  redirect(`/${locale}/admin/tasks`);
}
