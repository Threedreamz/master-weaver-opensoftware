"use server";

import { db } from "@/db";
import {
  deskVorgaenge,
  deskVorgangHistory,
  deskVorgangComments,
  deskVorgangFiles,
} from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { advanceVorgang, startFlowForVorgang } from "@/lib/flow-engine";
import { notifyVorgangStatusChange } from "@/lib/webhooks";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export async function createVorgang(formData: FormData) {
  const title = formData.get("title") as string;
  const description = formData.get("description") as string | null;
  const priority = (formData.get("priority") as "low" | "medium" | "high" | "critical") || "medium";
  const deadlineRaw = formData.get("deadline") as string | null;
  const flowId = formData.get("flowId") as string | null;
  const locale = (formData.get("locale") as string) || "de";

  if (!title) {
    throw new Error("Title is required");
  }

  const year = new Date().getFullYear();
  const countResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(deskVorgaenge);
  const num = (countResult[0]?.count ?? 0) + 1;
  const globalId = `VG-${year}-${String(num).padStart(4, "0")}`;

  const deadline = deadlineRaw ? new Date(deadlineRaw) : null;

  const result = await db
    .insert(deskVorgaenge)
    .values({
      globalId,
      title,
      description: description || null,
      priority,
      deadline: deadline ?? undefined,
      globalStatus: "entwurf",
      flowId: flowId || null,
    })
    .returning({ id: deskVorgaenge.id });

  const id = result[0]?.id;

  // Insert initial history entry
  await db.insert(deskVorgangHistory).values({
    vorgangId: id,
    action: "created",
    newStatus: "entwurf",
    comment: "Vorgang erstellt",
  });

  revalidatePath(`/${locale}/admin/vorgaenge`);
  redirect(`/${locale}/admin/vorgaenge/${id}`);
}

export async function updateVorgangStatus(formData: FormData) {
  const id = formData.get("id") as string;
  const newStatus = formData.get("newStatus") as
    | "entwurf"
    | "aktiv"
    | "pausiert"
    | "abgeschlossen"
    | "storniert";
  const locale = (formData.get("locale") as string) || "de";

  if (!id || !newStatus) return;

  const existing = await db.query.deskVorgaenge.findFirst({
    where: (v, { eq }) => eq(v.id, id),
  });

  if (!existing) return;

  // When activating: auto-start flow if one is assigned
  if (newStatus === "aktiv" && existing.globalStatus === "entwurf" && existing.flowId) {
    await startFlowForVorgang(id, existing.flowId, "system");
    revalidatePath(`/${locale}/admin/vorgaenge/${id}`);
    redirect(`/${locale}/admin/vorgaenge/${id}`);
  }

  await db
    .update(deskVorgaenge)
    .set({ globalStatus: newStatus, updatedAt: new Date() })
    .where(eq(deskVorgaenge.id, id));

  await db.insert(deskVorgangHistory).values({
    vorgangId: id,
    action: "status_changed",
    oldStatus: existing.globalStatus,
    newStatus,
    comment: `Status geändert: ${existing.globalStatus} → ${newStatus}`,
  });

  // Fire webhook (non-blocking)
  notifyVorgangStatusChange(id, existing.globalStatus, newStatus, {
    globalId: existing.globalId,
    title: existing.title,
  });

  revalidatePath(`/${locale}/admin/vorgaenge/${id}`);
  redirect(`/${locale}/admin/vorgaenge/${id}`);
}

export async function advanceVorgangAction(formData: FormData) {
  const id = formData.get("id") as string;
  const locale = (formData.get("locale") as string) || "de";

  if (!id) return;

  await advanceVorgang(id, "system");

  revalidatePath(`/${locale}/admin/vorgaenge/${id}`);
  redirect(`/${locale}/admin/vorgaenge/${id}`);
}

export async function uploadVorgangFile(formData: FormData) {
  const vorgangId = formData.get("vorgangId") as string;
  const locale = (formData.get("locale") as string) || "de";
  const file = formData.get("file") as File | null;

  if (!vorgangId || !file || file.size === 0) return;

  const uploadDir = path.join(process.cwd(), "data", "uploads", vorgangId);
  await mkdir(uploadDir, { recursive: true });

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  const filename = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
  const filepath = path.join(uploadDir, filename);
  await writeFile(filepath, buffer);

  await db.insert(deskVorgangFiles).values({
    vorgangId,
    filename: file.name,
    storedName: filename,
    contentType: file.type || "application/octet-stream",
    fileSize: file.size,
    uploadedBy: null,
  });

  revalidatePath(`/${locale}/admin/vorgaenge/${vorgangId}`);
  redirect(`/${locale}/admin/vorgaenge/${vorgangId}`);
}

export async function assignVorgang(formData: FormData) {
  const id = formData.get("id") as string;
  const assignedTo = formData.get("assignedTo") as string | null;
  const locale = (formData.get("locale") as string) || "de";

  if (!id) return;

  await db
    .update(deskVorgaenge)
    .set({ assignedTo: assignedTo || null, updatedAt: new Date() })
    .where(eq(deskVorgaenge.id, id));

  await db.insert(deskVorgangHistory).values({
    vorgangId: id,
    action: "assigned",
    comment: assignedTo ? `Zugewiesen an: ${assignedTo}` : "Zuweisung aufgehoben",
  });

  revalidatePath(`/${locale}/admin/vorgaenge/${id}`);
  redirect(`/${locale}/admin/vorgaenge/${id}`);
}

export async function addVorgangComment(formData: FormData) {
  const vorgangId = formData.get("vorgangId") as string;
  const content = formData.get("content") as string;
  const locale = (formData.get("locale") as string) || "de";

  if (!vorgangId || !content) {
    throw new Error("vorgangId and content are required");
  }

  await db.insert(deskVorgangComments).values({
    vorgangId,
    content,
  });

  revalidatePath(`/${locale}/admin/vorgaenge/${vorgangId}`);
  redirect(`/${locale}/admin/vorgaenge/${vorgangId}`);
}

export async function deleteVorgang(formData: FormData) {
  const id = formData.get("id") as string;
  const locale = (formData.get("locale") as string) || "de";
  if (!id) return;

  await db.delete(deskVorgaenge).where(eq(deskVorgaenge.id, id));
  revalidatePath(`/${locale}/admin/vorgaenge`);
  redirect(`/${locale}/admin/vorgaenge`);
}
