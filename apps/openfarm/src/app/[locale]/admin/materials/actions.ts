"use server";

import { db } from "@/db";
import { farmMaterials } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function createMaterial(formData: FormData) {
  const name = formData.get("name") as string;
  const technology = formData.get("technology") as string;
  const type = formData.get("type") as string;
  const manufacturer = formData.get("manufacturer") as string | null;
  const color = formData.get("color") as string | null;
  const colorHex = formData.get("colorHex") as string | null;
  const totalQuantity = formData.get("totalQuantity") ? Number(formData.get("totalQuantity")) : null;
  const unit = formData.get("unit") as string | null;
  const costPerUnit = formData.get("costPerUnit") ? Number(formData.get("costPerUnit")) : null;
  const diameter = formData.get("diameter") ? Number(formData.get("diameter")) : null;
  const printTempMin = formData.get("printTempMin") ? Number(formData.get("printTempMin")) : null;
  const printTempMax = formData.get("printTempMax") ? Number(formData.get("printTempMax")) : null;
  const bedTempMin = formData.get("bedTempMin") ? Number(formData.get("bedTempMin")) : null;
  const bedTempMax = formData.get("bedTempMax") ? Number(formData.get("bedTempMax")) : null;
  const notes = formData.get("notes") as string | null;

  if (!name || !technology || !type) {
    throw new Error("Name, technology, and type are required");
  }

  await db.insert(farmMaterials).values({
    name,
    technology: technology as "fdm" | "sla" | "sls",
    type,
    manufacturer: manufacturer || null,
    color: color || null,
    colorHex: colorHex || null,
    totalQuantity,
    unit: (unit as "g" | "ml" | "kg" | "l") || "g",
    costPerUnit,
    diameter,
    printTempMin,
    printTempMax,
    bedTempMin,
    bedTempMax,
    notes: notes || null,
  });

  const locale = formData.get("locale") as string || "de";
  revalidatePath(`/${locale}/admin/materials`);
  redirect(`/${locale}/admin/materials`);
}

export async function deleteMaterial(formData: FormData) {
  const id = formData.get("id") as string;
  if (!id) return;

  await db.delete(farmMaterials).where(eq(farmMaterials.id, id));
  revalidatePath("/[locale]/admin/materials");
}
