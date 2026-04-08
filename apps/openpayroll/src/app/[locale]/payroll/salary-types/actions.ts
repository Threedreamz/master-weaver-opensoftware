"use server";

import { db, schema } from "@/db";
import { eq } from "drizzle-orm";
import type { PayLohnart, NewPayLohnart } from "@opensoftware/db/openpayroll";

export async function getSalaryTypes(): Promise<PayLohnart[]> {
  return db.select().from(schema.payLohnarten).orderBy(schema.payLohnarten.nummer);
}

export async function createSalaryType(data: {
  nummer: string;
  bezeichnung: string;
  typ: "brutto" | "netto" | "abzug" | "ag_anteil";
  kontoSoll?: string;
  kontoHaben?: string;
  steuerpflichtig?: boolean;
  svPflichtig?: boolean;
}): Promise<PayLohnart> {
  const rows = await db
    .insert(schema.payLohnarten)
    .values({
      nummer: data.nummer,
      bezeichnung: data.bezeichnung,
      typ: data.typ,
      kontoSoll: data.kontoSoll,
      kontoHaben: data.kontoHaben,
      steuerpflichtig: data.steuerpflichtig ?? true,
      svPflichtig: data.svPflichtig ?? true,
      isActive: true,
    })
    .returning();

  return rows[0]!;
}

export async function updateSalaryType(
  id: number,
  data: Partial<Omit<NewPayLohnart, "id" | "createdAt">>
): Promise<PayLohnart | undefined> {
  const rows = await db
    .update(schema.payLohnarten)
    .set(data)
    .where(eq(schema.payLohnarten.id, id))
    .returning();
  return rows[0];
}

export async function deleteSalaryType(id: number): Promise<boolean> {
  const result = await db
    .delete(schema.payLohnarten)
    .where(eq(schema.payLohnarten.id, id))
    .returning();
  return result.length > 0;
}
