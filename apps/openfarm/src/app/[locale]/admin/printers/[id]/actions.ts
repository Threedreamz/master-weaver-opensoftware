"use server";

import { db } from "@/db";
import { farmPrinters } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function updatePrinterAction(formData: FormData) {
  const id = formData.get("id") as string;
  const locale = formData.get("locale") as string || "de";

  const name = formData.get("name") as string;
  const technology = formData.get("technology") as string;
  const protocol = formData.get("protocol") as string;
  const make = formData.get("make") as string | null;
  const model = formData.get("model") as string | null;
  const ipAddress = formData.get("ipAddress") as string | null;
  const port = formData.get("port") ? Number(formData.get("port")) : null;
  const apiKey = formData.get("apiKey") as string | null;
  const accessToken = formData.get("accessToken") as string | null;
  const serialNumber = formData.get("serialNumber") as string | null;
  const buildVolumeX = formData.get("buildVolumeX") ? Number(formData.get("buildVolumeX")) : null;
  const buildVolumeY = formData.get("buildVolumeY") ? Number(formData.get("buildVolumeY")) : null;
  const buildVolumeZ = formData.get("buildVolumeZ") ? Number(formData.get("buildVolumeZ")) : null;
  const nozzleDiameter = formData.get("nozzleDiameter") ? Number(formData.get("nozzleDiameter")) : null;
  const notes = formData.get("notes") as string | null;

  if (!name || !technology || !protocol) {
    throw new Error("Name, technology, and protocol are required");
  }

  await db.update(farmPrinters).set({
    name,
    technology: technology as "fdm" | "sla" | "sls",
    protocol: protocol as "moonraker" | "octoprint" | "bambu_mqtt" | "bambu_cloud" | "formlabs_local" | "formlabs_cloud" | "sls4all" | "manual",
    make: make || null,
    model: model || null,
    ipAddress: ipAddress || null,
    port,
    apiKey: apiKey || null,
    accessToken: accessToken || null,
    serialNumber: serialNumber || null,
    buildVolumeX,
    buildVolumeY,
    buildVolumeZ,
    nozzleDiameter,
    notes: notes || null,
    updatedAt: sql`(unixepoch())`,
  }).where(eq(farmPrinters.id, id));

  revalidatePath(`/${locale}/admin/printers`);
  redirect(`/${locale}/admin/printers`);
}

export async function deletePrinterAction(formData: FormData) {
  const id = formData.get("id") as string;
  const locale = formData.get("locale") as string || "de";

  if (!id) return;

  await db.delete(farmPrinters).where(eq(farmPrinters.id, id));

  revalidatePath(`/${locale}/admin/printers`);
  redirect(`/${locale}/admin/printers`);
}
