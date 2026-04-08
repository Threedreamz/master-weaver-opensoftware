"use server";

import { db, schema } from "@/db";
import { eq, desc } from "drizzle-orm";

// ==================== Company Layout ====================

export async function getCompanyLayout() {
  try {
    const rows = await db
      .select()
      .from(schema.acctCompanyLayout)
      .limit(1);
    return rows[0] || null;
  } catch {
    return null;
  }
}

export async function updateCompanyLayout(data: {
  companyName?: string;
  companyAddress?: string;
  companyPlz?: string;
  companyCity?: string;
  companyPhone?: string;
  companyEmail?: string;
  companyWebsite?: string;
  taxId?: string;
  vatId?: string;
  bankName?: string;
  bankIban?: string;
  bankBic?: string;
  managingDirector?: string;
  registryCourt?: string;
  registryNumber?: string;
  accentColor?: string;
}) {
  try {
    const existing = await db
      .select()
      .from(schema.acctCompanyLayout)
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(schema.acctCompanyLayout)
        .set({ ...data, updatedAt: new Date().toISOString() })
        .where(eq(schema.acctCompanyLayout.id, existing[0].id));
    } else {
      await db.insert(schema.acctCompanyLayout).values(data);
    }
    return { success: true };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

// ==================== Number Formats ====================

export async function getNumberFormats() {
  try {
    const formats = await db
      .select()
      .from(schema.acctNumberFormats);
    return formats;
  } catch {
    return [];
  }
}

export async function updateNumberFormat(
  prefix: string,
  data: {
    label?: string;
    formatTemplate?: string;
    padding?: number;
    perYear?: boolean;
  }
) {
  try {
    await db
      .update(schema.acctNumberFormats)
      .set({ ...data, updatedAt: new Date().toISOString() })
      .where(eq(schema.acctNumberFormats.prefix, prefix));
    return { success: true };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

// ==================== Webhooks ====================

export async function getWebhooks() {
  try {
    const webhooks = await db
      .select()
      .from(schema.acctWebhooks)
      .orderBy(desc(schema.acctWebhooks.createdAt));
    return webhooks;
  } catch {
    return [];
  }
}

export async function createWebhook(data: {
  url: string;
  events: string[];
  secret?: string;
}) {
  try {
    const result = await db
      .insert(schema.acctWebhooks)
      .values({
        url: data.url,
        events: data.events,
        secret: data.secret || null,
        isActive: true,
      })
      .returning();
    return { success: true, webhook: result[0] };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

export async function deleteWebhook(id: number) {
  try {
    await db
      .delete(schema.acctWebhooks)
      .where(eq(schema.acctWebhooks.id, id));
    return { success: true };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

// ==================== Document Templates ====================

export async function getDocumentTemplates() {
  try {
    const templates = await db
      .select()
      .from(schema.acctDocumentTemplates)
      .orderBy(schema.acctDocumentTemplates.docType);
    return templates;
  } catch {
    return [];
  }
}
