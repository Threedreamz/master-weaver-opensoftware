"use server";

import { db } from "@/db";
import { deskEquipment } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function createEquipment(formData: FormData) {
  const name = formData.get("name") as string;
  const category = formData.get("category") as string;
  const workstationId = formData.get("workstationId") as string;
  const serialNumber = (formData.get("serialNumber") as string) || null;
  const notes = (formData.get("notes") as string) || null;
  const purchaseDateRaw = formData.get("purchaseDate") as string | null;
  const warrantyUntilRaw = formData.get("warrantyUntil") as string | null;
  const locale = (formData.get("locale") as string) || "de";

  if (!name || !category || !workstationId) {
    throw new Error("Name, Kategorie und Arbeitsplatz sind Pflichtfelder");
  }

  const purchaseDate = purchaseDateRaw ? new Date(purchaseDateRaw) : null;
  const warrantyUntil = warrantyUntilRaw ? new Date(warrantyUntilRaw) : null;

  await db.insert(deskEquipment).values({
    name,
    category: category as
      | "computer"
      | "monitor"
      | "scanner_3d"
      | "printer_3d"
      | "tool"
      | "measurement"
      | "safety"
      | "furniture"
      | "other",
    workstationId,
    serialNumber,
    notes,
    purchaseDate,
    warrantyUntil,
  });

  revalidatePath(`/${locale}/admin/equipment`);
  redirect(`/${locale}/admin/equipment`);
}

export async function deleteEquipment(formData: FormData) {
  const id = formData.get("id") as string;
  const locale = (formData.get("locale") as string) || "de";

  if (!id) return;

  await db.delete(deskEquipment).where(eq(deskEquipment.id, id));

  revalidatePath(`/${locale}/admin/equipment`);
}
