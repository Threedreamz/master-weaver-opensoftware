/**
 * Seed: OpenFlow — flow, steps, and submission for Max Mustermann's contact form
 *
 * Note: OpenFlow has its own local schema (apps/openflow/src/db/schema.ts)
 * with its own `users` table. The db type matches that local schema.
 */
import type { DbClient } from "../create-db";
import { mustermannUser, mustermannFlow, MUSTERMANN_USER_ID } from "./mustermann";

// OpenFlow has its own local schema — path is relative to packages/db/src/seed/
import { users, flows, flowSteps, flowEdges, submissions } from "../../../../apps/openflow/src/db/schema";

export async function seedOpenflow(db: DbClient) {
  // 1. User (OpenFlow users table has slightly different columns — map accordingly)
  await db
    .insert(users)
    .values({
      id: mustermannUser.id,
      email: mustermannUser.email,
      name: mustermannUser.name,
      username: mustermannUser.username,
      displayName: mustermannUser.displayName,
      role: "admin" as const,
      locale: "de" as const,
      image: null,
      emailVerified: null,
    })
    .onConflictDoNothing();

  // 2. Flow (Kontaktformular)
  const flowId = "flow_kontakt_mustermann_001";
  await db
    .insert(flows)
    .values({
      id: flowId,
      name: mustermannFlow.name,
      slug: mustermannFlow.slug,
      description: mustermannFlow.description,
      status: mustermannFlow.status,
      createdBy: MUSTERMANN_USER_ID,
    })
    .onConflictDoNothing();

  // 3. Flow steps (start -> form fields -> end)
  const startStepId = "step_kontakt_start_001";
  const formStepId = "step_kontakt_form_001";
  const endStepId = "step_kontakt_end_001";

  await db.insert(flowSteps).values([
    {
      id: startStepId,
      flowId,
      type: "start" as const,
      label: "Start",
      positionX: 250,
      positionY: 50,
      sortOrder: 0,
    },
    {
      id: formStepId,
      flowId,
      type: "step" as const,
      label: "Kontaktdaten & Nachricht",
      positionX: 250,
      positionY: 200,
      sortOrder: 1,
      config: JSON.stringify({
        fields: [
          { key: "name", type: "text", label: "Name", required: true },
          { key: "email", type: "email", label: "E-Mail", required: true },
          { key: "company", type: "text", label: "Firma", required: false },
          { key: "message", type: "textarea", label: "Ihre Nachricht", required: true },
        ],
      }),
    },
    {
      id: endStepId,
      flowId,
      type: "end" as const,
      label: "Vielen Dank!",
      positionX: 250,
      positionY: 400,
      sortOrder: 2,
      config: JSON.stringify({
        successMessage: "Vielen Dank für Ihre Anfrage! Wir melden uns innerhalb von 24 Stunden.",
      }),
    },
  ]).onConflictDoNothing();

  // 4. Edges connecting the steps
  await db.insert(flowEdges).values([
    {
      flowId,
      sourceStepId: startStepId,
      targetStepId: formStepId,
      conditionType: "always" as const,
    },
    {
      flowId,
      sourceStepId: formStepId,
      targetStepId: endStepId,
      conditionType: "always" as const,
    },
  ]).onConflictDoNothing();

  // 5. One submission from Max
  await db
    .insert(submissions)
    .values({
      flowId,
      status: "completed" as const,
      answers: JSON.stringify({
        name: "Max Mustermann",
        email: "max@mustermann.de",
        company: "Mustermann GmbH",
        message: "Ich interessiere mich für Ihren 3D-Druck Service. Können Sie mir ein Angebot für 100 Ersatzteile (Material: PA12 Nylon) zusenden? Lieferadresse: Musterstraße 1, 40210 Düsseldorf.",
      }),
      metadata: JSON.stringify({
        userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/131.0",
        referrer: "https://google.de",
        ip: "203.0.113.42",
        locale: "de-DE",
      }),
      completedAt: new Date("2024-11-08T10:32:00Z"),
      lastStepId: endStepId,
    })
    .onConflictDoNothing();

  console.log("[seed-openflow] Seeded 1 flow, 3 steps, 2 edges, 1 submission");
}
