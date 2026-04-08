"use server";

import { db, schema } from "@/db";
import { eq } from "drizzle-orm";

type AcctAnlagegut = typeof schema.acctAnlagegueter.$inferSelect;

export async function getAnlagegueter(): Promise<AcctAnlagegut[]> {
  try {
    return await db.select().from(schema.acctAnlagegueter).orderBy(schema.acctAnlagegueter.anschaffungsdatum);
  } catch {
    return [];
  }
}

export async function createAnlagegut(data: {
  bezeichnung: string;
  inventarnummer: string;
  anschaffungsdatum: string;
  anschaffungskosten: number;
  nutzungsdauerJahre: number;
  afaMethode?: "linear" | "degressiv";
  afaSatz?: number;
  konto?: string;
  afaKonto?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const afaSatz =
      data.afaSatz ??
      (data.afaMethode === "degressiv"
        ? Math.min(25, (100 / data.nutzungsdauerJahre) * 2.5)
        : 100 / data.nutzungsdauerJahre);

    await db.insert(schema.acctAnlagegueter).values({
      bezeichnung: data.bezeichnung,
      inventarnummer: data.inventarnummer,
      anschaffungsdatum: data.anschaffungsdatum,
      anschaffungskosten: data.anschaffungskosten,
      nutzungsdauerJahre: data.nutzungsdauerJahre,
      afaMethode: data.afaMethode ?? "linear",
      afaSatz,
      konto: data.konto ?? null,
      afaKonto: data.afaKonto ?? null,
      restwert: data.anschaffungskosten,
      kumulierteAfa: 0,
      status: "aktiv",
    });

    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * Run depreciation for all active assets for a given year/month.
 * Creates AfA booking entries and updates the asset's restwert and kumulierteAfa.
 */
export async function runDepreciation(
  jahr: number,
  monat?: number
): Promise<{ success: boolean; processed: number; error?: string }> {
  try {
    const assets = await db
      .select()
      .from(schema.acctAnlagegueter)
      .where(eq(schema.acctAnlagegueter.status, "aktiv"));

    let processed = 0;

    for (const asset of assets) {
      const yearlyAmount = asset.afaMethode === "linear"
        ? asset.anschaffungskosten / asset.nutzungsdauerJahre
        : (asset.restwert ?? asset.anschaffungskosten) * ((asset.afaSatz ?? 0) / 100);

      // Monthly or annual depreciation
      const betrag = monat !== undefined ? yearlyAmount / 12 : yearlyAmount;
      const currentRestwert = asset.restwert ?? asset.anschaffungskosten;
      const actualBetrag = Math.min(betrag, currentRestwert);

      if (actualBetrag <= 0) continue;

      const restwertNachher = currentRestwert - actualBetrag;
      const newKumuliert = (asset.kumulierteAfa ?? 0) + actualBetrag;

      await db.insert(schema.acctAfaBuchungen).values({
        anlagegutId: asset.id,
        jahr,
        monat: monat ?? null,
        betrag: actualBetrag,
        restwertNachher,
        buchungstext: `AfA ${asset.bezeichnung} ${monat ? `${monat}/${jahr}` : jahr}`,
      });

      const newStatus = restwertNachher <= 0 ? "vollstaendig_abgeschrieben" : "aktiv";

      await db
        .update(schema.acctAnlagegueter)
        .set({
          restwert: Math.max(0, restwertNachher),
          kumulierteAfa: newKumuliert,
          status: newStatus as "aktiv" | "vollstaendig_abgeschrieben" | "ausgeschieden",
        })
        .where(eq(schema.acctAnlagegueter.id, asset.id));

      processed++;
    }

    return { success: true, processed };
  } catch (err) {
    return {
      success: false,
      processed: 0,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
