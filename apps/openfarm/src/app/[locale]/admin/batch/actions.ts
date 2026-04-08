"use server";

import { db } from "@/db";
import { farmBatchJobs } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function deleteBatchJob(formData: FormData) {
  const id = formData.get("id") as string;
  if (!id) return;

  await db.delete(farmBatchJobs).where(eq(farmBatchJobs.id, id));
  revalidatePath("/[locale]/admin/batch");
}
