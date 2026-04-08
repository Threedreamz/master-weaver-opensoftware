"use server";

import { db } from "@/db";
import { farmMaintenanceTasks } from "@/db/schema";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function createMaintenanceTaskAction(formData: FormData) {
  const locale = formData.get("locale") as string || "de";
  const name = formData.get("name") as string;
  const printerId = formData.get("printerId") as string;
  const type = formData.get("type") as string;
  const description = formData.get("description") as string | null;
  const intervalHours = formData.get("intervalHours") ? Number(formData.get("intervalHours")) : null;
  const dueAtStr = formData.get("dueAt") as string | null;

  if (!name || !printerId || !type) {
    throw new Error("Name, printer, and type are required");
  }

  const dueAt = dueAtStr ? new Date(dueAtStr) : undefined;

  await db.insert(farmMaintenanceTasks).values({
    name,
    printerId,
    type: type as "routine" | "preventive" | "corrective" | "calibration",
    description: description || null,
    intervalHours,
    dueAt,
  });

  revalidatePath(`/${locale}/admin/maintenance`);
  redirect(`/${locale}/admin/maintenance`);
}
