import { db, schema } from "@/db";
import { eq, and } from "drizzle-orm";
import { createNotification } from "./notify";
import type { AutomationBedingung, AutomationAktion } from "@opensoftware/db/openpipeline";

export interface AutomationEvent {
  typ: "karte_verschoben" | "karte_erstellt" | "karte_erledigt" | "stufe_voll";
  karteId: string;
  pipelineId: string;
  stufeId?: string;
  vonStufeId?: string;
  nachStufeId?: string;
  userId?: string;
}

/**
 * Run all active automations for a pipeline that match the given event.
 */
export async function runAutomations(event: AutomationEvent) {
  const automations = db
    .select()
    .from(schema.pipAutomatisierungen)
    .where(
      and(
        eq(schema.pipAutomatisierungen.pipelineId, event.pipelineId),
        eq(schema.pipAutomatisierungen.aktiv, true),
        eq(schema.pipAutomatisierungen.ausloeser, event.typ),
      )
    )
    .all();

  for (const auto of automations) {
    try {
      if (!matchesBedingungen(auto.bedingungen, event)) continue;

      const aktionen = auto.aktionen ?? [];
      for (const aktion of aktionen) {
        await executeAktion(aktion, event);
      }

      // Log success
      db.insert(schema.pipAutomationLog)
        .values({
          id: crypto.randomUUID(),
          automatisierungId: auto.id,
          karteId: event.karteId,
          ergebnis: "erfolg",
          details: { event, aktionenCount: aktionen.length },
        })
        .run();
    } catch (error) {
      // Log failure
      db.insert(schema.pipAutomationLog)
        .values({
          id: crypto.randomUUID(),
          automatisierungId: auto.id,
          karteId: event.karteId,
          ergebnis: "fehler",
          details: { event, error: String(error) },
        })
        .run();
    }
  }
}

function matchesBedingungen(bedingungen: AutomationBedingung | null, event: AutomationEvent): boolean {
  if (!bedingungen) return true;

  if (bedingungen.stufeId && event.nachStufeId && bedingungen.stufeId !== event.nachStufeId) {
    return false;
  }

  if (bedingungen.status) {
    const karte = db.select().from(schema.pipKarten).where(eq(schema.pipKarten.id, event.karteId)).get();
    if (karte && karte.status !== bedingungen.status) return false;
  }

  if (bedingungen.prioritaet) {
    const karte = db.select().from(schema.pipKarten).where(eq(schema.pipKarten.id, event.karteId)).get();
    if (karte && karte.prioritaet !== bedingungen.prioritaet) return false;
  }

  return true;
}

async function executeAktion(aktion: AutomationAktion, event: AutomationEvent) {
  switch (aktion.typ) {
    case "zuweisen": {
      const userId = aktion.parameter.userId as string;
      if (!userId) break;
      db.insert(schema.pipKartenMitglieder)
        .values({
          id: crypto.randomUUID(),
          karteId: event.karteId,
          userId,
          rolle: "mitarbeiter",
        })
        .onConflictDoNothing()
        .run();
      break;
    }

    case "benachrichtigen": {
      const targetUserId = aktion.parameter.userId as string;
      const nachricht = aktion.parameter.nachricht as string || "Automation ausgefuehrt";
      if (!targetUserId) break;
      const karte = db.select().from(schema.pipKarten).where(eq(schema.pipKarten.id, event.karteId)).get();
      createNotification(targetUserId, "verschoben", nachricht, {
        karteId: event.karteId,
        pipelineId: event.pipelineId,
        link: `/pipelines/${event.pipelineId}?karte=${event.karteId}`,
        nachricht: karte?.titel,
      });
      break;
    }

    case "verschieben": {
      const zielStufeId = aktion.parameter.stufeId as string;
      if (!zielStufeId) break;
      db.update(schema.pipKarten)
        .set({ stufeId: zielStufeId, updatedAt: new Date() })
        .where(eq(schema.pipKarten.id, event.karteId))
        .run();
      db.insert(schema.pipKartenHistorie)
        .values({
          id: crypto.randomUUID(),
          karteId: event.karteId,
          aktion: "verschoben",
          vonStufeId: event.nachStufeId,
          nachStufeId: zielStufeId,
          kommentar: "Automatisch verschoben",
        })
        .run();
      break;
    }

    case "webhook": {
      const url = aktion.parameter.url as string;
      if (!url) break;
      const karte = db.select().from(schema.pipKarten).where(eq(schema.pipKarten.id, event.karteId)).get();
      await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event, karte }),
      }).catch(() => { /* webhook failure is non-fatal */ });
      break;
    }

    default:
      break;
  }
}
