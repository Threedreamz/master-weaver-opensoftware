"use server";

import { db, schema } from "@/db";

export interface YearEndTask {
  id: string;
  label: string;
  description: string;
  status: "pending" | "running" | "done" | "error";
  runnable: boolean;
}

export async function getYearEndChecklist(year: number): Promise<YearEndTask[]> {
  // In a full implementation, task status would be determined
  // by checking whether the corresponding records exist in the database.
  return [
    {
      id: "close-books",
      label: "Close Books",
      description: `Close all open booking periods for ${year}`,
      status: "pending",
      runnable: true,
    },
    {
      id: "generate-pnl",
      label: "Generate P&L (GuV)",
      description: `Generate profit & loss statement for ${year}`,
      status: "pending",
      runnable: true,
    },
    {
      id: "generate-balance",
      label: "Generate Balance Sheet (Bilanz)",
      description: `Generate balance sheet as of Dec 31, ${year}`,
      status: "pending",
      runnable: true,
    },
    {
      id: "calculate-depreciation",
      label: "Calculate Depreciation (AfA)",
      description: `Run annual depreciation for all active fixed assets in ${year}`,
      status: "pending",
      runnable: true,
    },
    {
      id: "vat-annual",
      label: "File VAT Annual Return (UStVA Jahreserklaerung)",
      description: `Prepare VAT annual return for ${year}`,
      status: "pending",
      runnable: true,
    },
  ];
}

export interface JahresabschlussRow {
  id: number;
  geschaeftsjahr: number;
  typ: string | null;
  status: string | null;
  erstelltAm: string | null;
  createdAt: string | null;
}

export async function getJahresabschluesse(): Promise<JahresabschlussRow[]> {
  try {
    return await db
      .select({
        id: schema.acctJahresabschluesse.id,
        geschaeftsjahr: schema.acctJahresabschluesse.geschaeftsjahr,
        typ: schema.acctJahresabschluesse.typ,
        status: schema.acctJahresabschluesse.status,
        erstelltAm: schema.acctJahresabschluesse.erstelltAm,
        createdAt: schema.acctJahresabschluesse.createdAt,
      })
      .from(schema.acctJahresabschluesse)
      .orderBy(schema.acctJahresabschluesse.geschaeftsjahr);
  } catch {
    return [];
  }
}

export async function createJahresabschluss(
  geschaeftsjahr: number,
  typ: "bilanz" | "guv" | "komplett" = "komplett"
): Promise<{ success: boolean; error?: string }> {
  try {
    await db.insert(schema.acctJahresabschluesse).values({
      geschaeftsjahr,
      typ,
      status: "entwurf",
      daten: null,
      erstelltAm: new Date().toISOString(),
    });

    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
