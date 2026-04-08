"use server";

import { db } from "@/db";
import { deskBuildings, deskZones } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function createBuilding(formData: FormData) {
  const name = formData.get("name") as string;
  const address = formData.get("address") as string | null;
  const description = formData.get("description") as string | null;
  const locale = (formData.get("locale") as string) || "de";

  if (!name) {
    throw new Error("Name is required");
  }

  await db.insert(deskBuildings).values({
    name,
    address: address || null,
    description: description || null,
  });

  revalidatePath(`/${locale}/admin/zones`);
  redirect(`/${locale}/admin/zones`);
}

export async function createZone(formData: FormData) {
  const name = formData.get("name") as string;
  const buildingId = formData.get("buildingId") as string;
  const type = formData.get("type") as "room" | "floor" | "area" | "hall";
  const floor = formData.get("floor") ? Number(formData.get("floor")) : null;
  const capacity = formData.get("capacity") ? Number(formData.get("capacity")) : null;
  const description = formData.get("description") as string | null;
  const locale = (formData.get("locale") as string) || "de";

  if (!name || !buildingId) {
    throw new Error("Name and buildingId are required");
  }

  await db.insert(deskZones).values({
    name,
    buildingId,
    type: type || "room",
    floor,
    capacity,
    description: description || null,
  });

  revalidatePath(`/${locale}/admin/zones`);
  redirect(`/${locale}/admin/zones`);
}

export async function deleteBuilding(formData: FormData) {
  const id = formData.get("id") as string;
  if (!id) return;

  await db.delete(deskBuildings).where(eq(deskBuildings.id, id));
  revalidatePath("/[locale]/admin/zones");
}

export async function deleteZone(formData: FormData) {
  const id = formData.get("id") as string;
  if (!id) return;

  await db.delete(deskZones).where(eq(deskZones.id, id));
  revalidatePath("/[locale]/admin/zones");
}
