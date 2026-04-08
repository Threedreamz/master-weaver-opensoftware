"use server";

import { db } from "@/db";
import { deskWorkstations } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function createWorkstation(formData: FormData) {
  const code = formData.get("code") as string;
  const name = formData.get("name") as string;
  const type = formData.get("type") as string;
  const zoneId = formData.get("zoneId") as string;
  const description = (formData.get("description") as string) || null;
  const assignedUserId = (formData.get("assignedUserId") as string) || null;
  const tagsRaw = (formData.get("tags") as string) || "";
  const locale = (formData.get("locale") as string) || "de";

  if (!code || !name || !type || !zoneId) {
    throw new Error("Code, Name, Typ und Bereich sind Pflichtfelder");
  }

  const tags: string[] = tagsRaw
    ? tagsRaw
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean)
    : [];

  await db.insert(deskWorkstations).values({
    code,
    name,
    type: type as
      | "scanning"
      | "cad"
      | "printing"
      | "quality_check"
      | "packaging"
      | "assembly"
      | "office"
      | "general",
    zoneId,
    description,
    assignedUserId: assignedUserId || null,
    tags: tags.length > 0 ? tags : null,
  });

  revalidatePath(`/${locale}/admin/workstations`);
  redirect(`/${locale}/admin/workstations`);
}

export async function updateWorkstation(formData: FormData) {
  const id = formData.get("id") as string;
  const code = formData.get("code") as string;
  const name = formData.get("name") as string;
  const type = formData.get("type") as string;
  const zoneId = formData.get("zoneId") as string;
  const status = formData.get("status") as string;
  const description = (formData.get("description") as string) || null;
  const assignedUserId = (formData.get("assignedUserId") as string) || null;
  const tagsRaw = (formData.get("tags") as string) || "";
  const locale = (formData.get("locale") as string) || "de";

  if (!id || !code || !name || !type || !zoneId) {
    throw new Error("ID, Code, Name, Typ und Bereich sind Pflichtfelder");
  }

  const tags: string[] = tagsRaw
    ? tagsRaw
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean)
    : [];

  await db
    .update(deskWorkstations)
    .set({
      code,
      name,
      type: type as
        | "scanning"
        | "cad"
        | "printing"
        | "quality_check"
        | "packaging"
        | "assembly"
        | "office"
        | "general",
      zoneId,
      status: status as "active" | "inactive" | "maintenance" | "reserved",
      description,
      assignedUserId: assignedUserId || null,
      tags: tags.length > 0 ? tags : null,
      updatedAt: new Date(),
    })
    .where(eq(deskWorkstations.id, id));

  revalidatePath(`/${locale}/admin/workstations`);
  revalidatePath(`/${locale}/admin/workstations/${id}`);
  redirect(`/${locale}/admin/workstations/${id}`);
}

export async function deleteWorkstation(formData: FormData) {
  const id = formData.get("id") as string;
  const locale = (formData.get("locale") as string) || "de";

  if (!id) return;

  await db.delete(deskWorkstations).where(eq(deskWorkstations.id, id));

  revalidatePath(`/${locale}/admin/workstations`);
  redirect(`/${locale}/admin/workstations`);
}
