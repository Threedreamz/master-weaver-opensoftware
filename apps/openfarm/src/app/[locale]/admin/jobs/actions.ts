"use server";

import { db } from "@/db";
import { farmPrintJobs } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function createJob(formData: FormData) {
  const name = formData.get("name") as string;
  const modelId = formData.get("modelId") as string;
  const printerId = formData.get("printerId") as string | null;
  const profileId = formData.get("profileId") as string | null;
  const materialId = formData.get("materialId") as string | null;
  const priority = formData.get("priority") ? Number(formData.get("priority")) : 0;
  const notes = formData.get("notes") as string | null;
  const quantity = formData.get("quantity") ? Number(formData.get("quantity")) : 1;

  if (!name || !modelId) {
    throw new Error("Job name and model are required");
  }

  // Create N jobs if quantity > 1
  for (let i = 0; i < quantity; i++) {
    const jobName = quantity > 1 ? `${name} #${i + 1}` : name;
    await db.insert(farmPrintJobs).values({
      name: jobName,
      modelId,
      printerId: printerId || null,
      profileId: profileId || null,
      materialId: materialId || null,
      priority,
      notes: notes || null,
    });
  }

  const locale = formData.get("locale") as string || "de";
  revalidatePath(`/${locale}/admin/jobs`);
  redirect(`/${locale}/admin/jobs`);
}

export async function updateJobStatus(formData: FormData) {
  const id = formData.get("id") as string;
  const status = formData.get("status") as string;
  const locale = formData.get("locale") as string || "de";

  if (!id || !status) return;

  const updates: Record<string, unknown> = {
    status,
    updatedAt: sql`(unixepoch())`,
  };
  if (status === "completed") updates.printCompletedAt = sql`(unixepoch())`;
  if (status === "printing") updates.printStartedAt = sql`(unixepoch())`;

  await db.update(farmPrintJobs).set(updates).where(eq(farmPrintJobs.id, id));

  revalidatePath(`/${locale}/admin/jobs/${id}`);
  revalidatePath(`/${locale}/admin/jobs`);
}

export async function deleteJob(formData: FormData) {
  const id = formData.get("id") as string;
  if (!id) return;

  await db.delete(farmPrintJobs).where(eq(farmPrintJobs.id, id));
  revalidatePath("/[locale]/admin/jobs");
}
