"use server";

import { db } from "@/db";
import { deskIssues } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function createIssue(formData: FormData) {
  const title = formData.get("title") as string;
  const workstationId = formData.get("workstationId") as string;
  const description = formData.get("description") as string | null;
  const priority = formData.get("priority") as string | null;
  const category = formData.get("category") as string | null;
  const equipmentId = formData.get("equipmentId") as string | null;
  const locale = (formData.get("locale") as string) || "de";

  if (!title || !workstationId) {
    throw new Error("title and workstationId are required");
  }

  await db.insert(deskIssues).values({
    title,
    workstationId,
    description: description || null,
    priority: (priority as "low" | "medium" | "high" | "critical") || "medium",
    category: (category as "hardware" | "software" | "environment" | "safety" | "other") || "other",
    equipmentId: equipmentId || null,
    status: "open",
  });

  revalidatePath(`/${locale}/admin/issues`);
  redirect(`/${locale}/admin/issues`);
}

export async function updateIssueStatus(formData: FormData) {
  const id = formData.get("id") as string;
  const status = formData.get("status") as "open" | "in_progress" | "resolved" | "closed";
  const locale = (formData.get("locale") as string) || "de";

  if (!id || !status) return;

  if (status === "resolved") {
    await db
      .update(deskIssues)
      .set({ status, resolvedAt: new Date(), updatedAt: new Date() })
      .where(eq(deskIssues.id, id));
  } else {
    await db
      .update(deskIssues)
      .set({ status, updatedAt: new Date() })
      .where(eq(deskIssues.id, id));
  }

  revalidatePath(`/${locale}/admin/issues`);
  redirect(`/${locale}/admin/issues`);
}

export async function deleteIssue(formData: FormData) {
  const id = formData.get("id") as string;
  const locale = (formData.get("locale") as string) || "de";

  if (!id) return;

  await db.delete(deskIssues).where(eq(deskIssues.id, id));

  revalidatePath(`/${locale}/admin/issues`);
  redirect(`/${locale}/admin/issues`);
}
