"use server";

import { db, schema } from "@/db";
import { eq, desc } from "drizzle-orm";

export async function getProductionOrders() {
  try {
    return await db
      .select()
      .from(schema.invProductionOrders)
      .orderBy(desc(schema.invProductionOrders.createdAt));
  } catch {
    return [];
  }
}

export async function createProductionOrder(data: {
  number: string;
  customerName?: string;
  customerCompany?: string;
  items?: Array<{ beschreibung: string; menge: number }>;
  notes?: string;
}) {
  try {
    const [order] = await db
      .insert(schema.invProductionOrders)
      .values({
        number: data.number,
        customerName: data.customerName,
        customerCompany: data.customerCompany,
        items: data.items,
        notes: data.notes,
        currentStep: "scanning",
        status: "neu",
        scanningStatus: "offen",
        cadStatus: "offen",
        qsCadStatus: "offen",
        druckenStatus: "offen",
        qsDruckenStatus: "offen",
      })
      .returning();
    return { success: true, order };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unknown error" };
  }
}

type ProductionStep = "scanning" | "cad" | "qs_cad" | "drucken" | "qs_drucken";
type StepStatus = "offen" | "in_bearbeitung" | "abgeschlossen" | "abgelehnt";

const STEP_ORDER: ProductionStep[] = ["scanning", "cad", "qs_cad", "drucken", "qs_drucken"];

const STEP_STATUS_COLUMN: Record<ProductionStep, string> = {
  scanning: "scanningStatus",
  cad: "cadStatus",
  qs_cad: "qsCadStatus",
  drucken: "druckenStatus",
  qs_drucken: "qsDruckenStatus",
};

export async function updateProductionStep(
  id: number,
  step: ProductionStep,
  newStatus: StepStatus,
  userName?: string,
  comment?: string
) {
  try {
    // Get current order
    const [order] = await db
      .select()
      .from(schema.invProductionOrders)
      .where(eq(schema.invProductionOrders.id, id));

    if (!order) {
      return { success: false, error: "Auftrag nicht gefunden" };
    }

    const statusField = STEP_STATUS_COLUMN[step];
    const oldStatus = (order as Record<string, unknown>)[statusField] as string;

    // Update the step status
    const updateData: Record<string, unknown> = {
      [statusField]: newStatus,
      updatedAt: new Date().toISOString(),
    };

    // If step completed, advance currentStep to next
    if (newStatus === "abgeschlossen") {
      const currentIdx = STEP_ORDER.indexOf(step);
      if (currentIdx < STEP_ORDER.length - 1) {
        updateData.currentStep = STEP_ORDER[currentIdx + 1];
      }
      // If last step completed, mark order as completed
      if (step === "qs_drucken") {
        updateData.status = "abgeschlossen";
      } else if (order.status === "neu") {
        updateData.status = "in_bearbeitung";
      }
    }

    await db
      .update(schema.invProductionOrders)
      .set(updateData)
      .where(eq(schema.invProductionOrders.id, id));

    // Record history
    await db.insert(schema.invProductionHistory).values({
      productionOrderId: id,
      step,
      action: `Status changed to ${newStatus}`,
      oldStatus,
      newStatus,
      comment,
      userName,
    });

    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unknown error" };
  }
}

export async function deleteProductionOrder(id: number) {
  try {
    await db.delete(schema.invProductionOrders).where(eq(schema.invProductionOrders.id, id));
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unknown error" };
  }
}
