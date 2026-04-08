"use server";

import { db, schema } from "@/db";
import { desc } from "drizzle-orm";

export interface AuditLogRow {
  id: number;
  entityType: string;
  entityId: string;
  action: string | null;
  userId: string | null;
  userName: string | null;
  changes: unknown;
  ipAddress: string | null;
  hash: string | null;
  createdAt: string | null;
}

export async function getAuditLogs(limit = 100): Promise<AuditLogRow[]> {
  try {
    return await db
      .select()
      .from(schema.acctAuditLogs)
      .orderBy(desc(schema.acctAuditLogs.createdAt))
      .limit(limit);
  } catch {
    return [];
  }
}

export interface VerfahrensDokuRow {
  id: number;
  titel: string;
  bereich: string | null;
  inhalt: string;
  version: number | null;
  erstelltVon: string | null;
  createdAt: string | null;
}

export async function getVerfahrensDoku(): Promise<VerfahrensDokuRow[]> {
  try {
    return await db.select().from(schema.acctVerfahrensDoku).orderBy(schema.acctVerfahrensDoku.titel);
  } catch {
    return [];
  }
}

export async function createVerfahrensDoku(data: {
  titel: string;
  bereich?: string;
  inhalt: string;
  erstelltVon?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    await db.insert(schema.acctVerfahrensDoku).values({
      titel: data.titel,
      bereich: data.bereich ?? null,
      inhalt: data.inhalt,
      version: 1,
      erstelltVon: data.erstelltVon ?? null,
    });

    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export interface AufbewahrungsfristRow {
  id: number;
  entityType: string;
  entityId: string;
  fristJahre: number;
  aufbewahrungBis: string;
  status: string | null;
  createdAt: string | null;
}

export async function getAufbewahrungsfristen(): Promise<AufbewahrungsfristRow[]> {
  try {
    return await db
      .select()
      .from(schema.acctAufbewahrungsfristen)
      .orderBy(schema.acctAufbewahrungsfristen.aufbewahrungBis);
  } catch {
    return [];
  }
}
