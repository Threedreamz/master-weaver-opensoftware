"use server";

import { db, schema } from "@/db";
import { eq } from "drizzle-orm";
import type { PayMitarbeiter, NewPayMitarbeiter } from "@opensoftware/db/openpayroll";

export async function getEmployees(): Promise<PayMitarbeiter[]> {
  return db.select().from(schema.payMitarbeiter).orderBy(schema.payMitarbeiter.personalnummer);
}

export async function getEmployee(id: number): Promise<PayMitarbeiter | undefined> {
  const rows = await db
    .select()
    .from(schema.payMitarbeiter)
    .where(eq(schema.payMitarbeiter.id, id))
    .limit(1);
  return rows[0];
}

export async function createEmployee(data: {
  personalnummer: string;
  vorname: string;
  nachname: string;
  eintrittsdatum: string;
  steuerklasse: number;
  bruttoGehalt: number;
  geburtsdatum?: string;
  steuerId?: string;
  sozialversicherungsnummer?: string;
  krankenkasse?: string;
  krankenkasseBeitragssatz?: number;
  kirchensteuer?: boolean;
  bundesland?: string;
  kinderfreibetraege?: number;
  iban?: string;
  bic?: string;
  adresse?: string;
  stundenlohn?: number;
  arbeitsstundenProWoche?: number;
}): Promise<PayMitarbeiter> {
  const rows = await db
    .insert(schema.payMitarbeiter)
    .values({
      personalnummer: data.personalnummer,
      vorname: data.vorname,
      nachname: data.nachname,
      eintrittsdatum: data.eintrittsdatum,
      steuerklasse: data.steuerklasse,
      bruttoGehalt: data.bruttoGehalt,
      geburtsdatum: data.geburtsdatum,
      steuerId: data.steuerId,
      sozialversicherungsnummer: data.sozialversicherungsnummer,
      krankenkasse: data.krankenkasse ?? "AOK",
      krankenkasseBeitragssatz: data.krankenkasseBeitragssatz ?? 14.6,
      kirchensteuer: data.kirchensteuer ?? false,
      bundesland: data.bundesland ?? "NW",
      kinderfreibetraege: data.kinderfreibetraege ?? 0,
      iban: data.iban,
      bic: data.bic,
      adresse: data.adresse,
      stundenlohn: data.stundenlohn,
      arbeitsstundenProWoche: data.arbeitsstundenProWoche ?? 40,
      status: "aktiv",
    })
    .returning();

  return rows[0]!;
}

export async function updateEmployee(
  id: number,
  data: Partial<Omit<NewPayMitarbeiter, "id" | "createdAt">>
): Promise<PayMitarbeiter | undefined> {
  const rows = await db
    .update(schema.payMitarbeiter)
    .set({ ...data, updatedAt: new Date().toISOString() })
    .where(eq(schema.payMitarbeiter.id, id))
    .returning();
  return rows[0];
}

export async function deleteEmployee(id: number): Promise<boolean> {
  const result = await db
    .delete(schema.payMitarbeiter)
    .where(eq(schema.payMitarbeiter.id, id))
    .returning();
  return result.length > 0;
}
