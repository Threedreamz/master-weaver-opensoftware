"use server";

import { db } from "@/db";
import { farmSlicerProfiles } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function createProfile(formData: FormData) {
  const name = formData.get("name") as string;
  const technology = formData.get("technology") as string;
  const slicerEngine = formData.get("slicerEngine") as string;
  const configRaw = formData.get("config") as string | null;
  const layerHeight = formData.get("layerHeight") ? Number(formData.get("layerHeight")) : null;
  const nozzleDiameter = formData.get("nozzleDiameter") ? Number(formData.get("nozzleDiameter")) : null;
  const infillDensity = formData.get("infillDensity") ? Number(formData.get("infillDensity")) : null;
  const description = formData.get("description") as string | null;

  if (!name || !technology || !slicerEngine) {
    throw new Error("Name, technology, and slicer engine are required");
  }

  let config: Record<string, unknown> = {};
  if (configRaw && configRaw.trim()) {
    try {
      config = JSON.parse(configRaw);
    } catch {
      throw new Error("Config must be valid JSON");
    }
  }

  await db.insert(farmSlicerProfiles).values({
    name,
    technology: technology as "fdm" | "sla" | "sls",
    slicerEngine: slicerEngine as "prusaslicer" | "orcaslicer" | "bambu_studio" | "preform" | "chitubox" | "lychee" | "sls4all" | "custom",
    config,
    layerHeight,
    nozzleDiameter,
    infillDensity,
    description,
  });

  const locale = formData.get("locale") as string || "de";
  revalidatePath(`/${locale}/admin/profiles`);
  redirect(`/${locale}/admin/profiles`);
}

export async function deleteProfile(formData: FormData) {
  const id = formData.get("id") as string;
  if (!id) return;

  await db.delete(farmSlicerProfiles).where(eq(farmSlicerProfiles.id, id));
  revalidatePath("/[locale]/admin/profiles");
}
