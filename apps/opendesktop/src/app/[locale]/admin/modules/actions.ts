"use server";

import { db } from "@/db";
import { deskModules, deskModuleStatuses, deskModuleFields } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

function slugify(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/[\s]+/g, "-")
    .replace(/[^\w-]+/g, "")
    .replace(/--+/g, "-");
}

export async function createModule(formData: FormData) {
  const name = formData.get("name") as string;
  const slugRaw = formData.get("slug") as string | null;
  const description = formData.get("description") as string | null;
  const icon = formData.get("icon") as string | null;
  const color = formData.get("color") as string | null;
  const locale = (formData.get("locale") as string) || "de";

  if (!name) {
    throw new Error("Name is required");
  }

  const slug = slugRaw && slugRaw.trim() ? slugify(slugRaw.trim()) : slugify(name);

  const result = await db
    .insert(deskModules)
    .values({
      name,
      slug,
      description: description || null,
      icon: icon || null,
      color: color || null,
    })
    .returning({ id: deskModules.id });

  const id = result[0]?.id;
  revalidatePath(`/${locale}/admin/modules`);
  redirect(`/${locale}/admin/modules/${id}`);
}

export async function deleteModule(formData: FormData) {
  const id = formData.get("id") as string;
  const locale = (formData.get("locale") as string) || "de";
  if (!id) return;

  await db.delete(deskModules).where(eq(deskModules.id, id));
  revalidatePath(`/${locale}/admin/modules`);
  redirect(`/${locale}/admin/modules`);
}

export async function createModuleStatus(formData: FormData) {
  const moduleId = formData.get("moduleId") as string;
  const name = formData.get("name") as string;
  const slugRaw = formData.get("slug") as string | null;
  const color = formData.get("color") as string | null;
  const isFinal = formData.get("isFinal") === "on";
  const isDefault = formData.get("isDefault") === "on";
  const sortOrder = formData.get("sortOrder") ? Number(formData.get("sortOrder")) : 0;
  const locale = (formData.get("locale") as string) || "de";

  if (!moduleId || !name) {
    throw new Error("moduleId and name are required");
  }

  const slug = slugRaw && slugRaw.trim() ? slugify(slugRaw.trim()) : slugify(name);

  await db.insert(deskModuleStatuses).values({
    moduleId,
    name,
    slug,
    color: color || null,
    isFinal,
    isDefault,
    sortOrder,
  });

  revalidatePath(`/${locale}/admin/modules/${moduleId}`);
  redirect(`/${locale}/admin/modules/${moduleId}`);
}

export async function deleteModuleStatus(formData: FormData) {
  const id = formData.get("id") as string;
  const moduleId = formData.get("moduleId") as string;
  const locale = (formData.get("locale") as string) || "de";
  if (!id) return;

  await db.delete(deskModuleStatuses).where(eq(deskModuleStatuses.id, id));
  revalidatePath(`/${locale}/admin/modules/${moduleId}`);
  redirect(`/${locale}/admin/modules/${moduleId}`);
}

export async function createModuleField(formData: FormData) {
  const moduleId = formData.get("moduleId") as string;
  const name = formData.get("name") as string;
  const slugRaw = formData.get("slug") as string | null;
  const fieldType = formData.get("fieldType") as
    | "text"
    | "number"
    | "date"
    | "select"
    | "checkbox"
    | "textarea"
    | "file"
    | "url";
  const required = formData.get("required") === "on";
  const defaultValue = formData.get("defaultValue") as string | null;
  const sortOrder = formData.get("sortOrder") ? Number(formData.get("sortOrder")) : 0;
  const locale = (formData.get("locale") as string) || "de";

  if (!moduleId || !name || !fieldType) {
    throw new Error("moduleId, name and fieldType are required");
  }

  const slug = slugRaw && slugRaw.trim() ? slugify(slugRaw.trim()) : slugify(name);

  await db.insert(deskModuleFields).values({
    moduleId,
    name,
    slug,
    fieldType,
    required,
    defaultValue: defaultValue || null,
    sortOrder,
  });

  revalidatePath(`/${locale}/admin/modules/${moduleId}`);
  redirect(`/${locale}/admin/modules/${moduleId}`);
}

export async function deleteModuleField(formData: FormData) {
  const id = formData.get("id") as string;
  const moduleId = formData.get("moduleId") as string;
  const locale = (formData.get("locale") as string) || "de";
  if (!id) return;

  await db.delete(deskModuleFields).where(eq(deskModuleFields.id, id));
  revalidatePath(`/${locale}/admin/modules/${moduleId}`);
  redirect(`/${locale}/admin/modules/${moduleId}`);
}
