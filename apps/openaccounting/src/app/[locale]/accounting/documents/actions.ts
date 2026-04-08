"use server";

import { db, schema } from "@/db";
import { eq, desc } from "drizzle-orm";

export type DocumentRow = typeof schema.acctDocuments.$inferSelect;

export async function getDocuments(): Promise<DocumentRow[]> {
  try {
    return await db
      .select()
      .from(schema.acctDocuments)
      .orderBy(desc(schema.acctDocuments.uploadedAt));
  } catch {
    return [];
  }
}

export async function uploadDocument(data: {
  filename: string;
  fileSize: number;
  fileType: string;
  supplier?: string;
  invoiceNumber?: string;
  amount?: number;
  date?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    // In production, the file would be saved to disk/object storage first.
    // Here we create the DB record with a placeholder path.
    const filePath = `uploads/${Date.now()}-${data.filename}`;

    await db.insert(schema.acctDocuments).values({
      filename: data.filename,
      filePath,
      fileType: data.fileType || null,
      fileSize: data.fileSize || null,
      supplier: data.supplier || null,
      invoiceNumber: data.invoiceNumber || null,
      amount: data.amount ?? null,
      date: data.date || null,
      status: "uploaded",
    });

    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to upload document",
    };
  }
}

export async function updateDocumentStatus(
  id: number,
  status: "uploaded" | "processing" | "processed" | "error"
): Promise<{ success: boolean; error?: string }> {
  try {
    await db
      .update(schema.acctDocuments)
      .set({ status })
      .where(eq(schema.acctDocuments.id, id));
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error:
        err instanceof Error
          ? err.message
          : "Failed to update document status",
    };
  }
}
