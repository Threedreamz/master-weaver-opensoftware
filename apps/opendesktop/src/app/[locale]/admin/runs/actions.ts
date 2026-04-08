"use server";

import { db } from "@/db";
import {
  deskWorkflowRuns,
  deskWorkflowRunSteps,
  deskWorkflowSteps,
} from "@/db/schema";
import { eq, asc, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function startWorkflowRun(formData: FormData) {
  const workflowId = formData.get("workflowId") as string;
  const workstationId = formData.get("workstationId") as string;
  const locale = (formData.get("locale") as string) || "de";

  if (!workflowId || !workstationId) {
    throw new Error("workflowId and workstationId are required");
  }

  // Load all workflow steps sorted by sortOrder
  const steps = await db.query.deskWorkflowSteps.findMany({
    where: eq(deskWorkflowSteps.workflowId, workflowId),
    orderBy: [asc(deskWorkflowSteps.sortOrder)],
  });

  const firstStep = steps[0] ?? null;

  // Create the run
  const [run] = await db
    .insert(deskWorkflowRuns)
    .values({
      workflowId,
      workstationId,
      status: "running",
      currentStepId: firstStep?.id ?? null,
    })
    .returning();

  // Create a runStep entry for every workflow step
  if (steps.length > 0) {
    await db.insert(deskWorkflowRunSteps).values(
      steps.map((step, index) => ({
        runId: run.id,
        stepId: step.id,
        status: index === 0 ? ("in_progress" as const) : ("pending" as const),
      }))
    );
  }

  revalidatePath(`/${locale}/admin/runs`);
  redirect(`/${locale}/admin/runs/${run.id}`);
}

export async function advanceRunStep(formData: FormData) {
  const runId = formData.get("runId") as string;
  const stepId = formData.get("stepId") as string;
  const locale = (formData.get("locale") as string) || "de";

  if (!runId || !stepId) {
    throw new Error("runId and stepId are required");
  }

  // Mark the current run step as completed
  await db
    .update(deskWorkflowRunSteps)
    .set({ status: "completed", completedAt: new Date() })
    .where(
      and(
        eq(deskWorkflowRunSteps.runId, runId),
        eq(deskWorkflowRunSteps.stepId, stepId)
      )
    );

  // Load all run steps ordered by the workflow step's sort order
  const run = await db.query.deskWorkflowRuns.findFirst({
    where: eq(deskWorkflowRuns.id, runId),
    with: {
      runSteps: {
        with: { step: true },
      },
    },
  });

  if (!run) {
    throw new Error("Run not found");
  }

  const sortedRunSteps = [...run.runSteps].sort(
    (a, b) => a.step.sortOrder - b.step.sortOrder
  );

  // Find the next pending step
  const nextRunStep = sortedRunSteps.find((rs) => rs.status === "pending");

  if (nextRunStep) {
    // Advance to next step
    await db
      .update(deskWorkflowRunSteps)
      .set({ status: "in_progress", startedAt: new Date() })
      .where(eq(deskWorkflowRunSteps.id, nextRunStep.id));

    await db
      .update(deskWorkflowRuns)
      .set({ currentStepId: nextRunStep.stepId })
      .where(eq(deskWorkflowRuns.id, runId));
  } else {
    // All steps done — mark run as completed
    await db
      .update(deskWorkflowRuns)
      .set({ status: "completed", completedAt: new Date(), currentStepId: null })
      .where(eq(deskWorkflowRuns.id, runId));
  }

  revalidatePath(`/${locale}/admin/runs`);
  revalidatePath(`/${locale}/admin/runs/${runId}`);
  redirect(`/${locale}/admin/runs/${runId}`);
}

export async function cancelRun(formData: FormData) {
  const runId = formData.get("runId") as string;
  const locale = (formData.get("locale") as string) || "de";

  if (!runId) return;

  await db
    .update(deskWorkflowRuns)
    .set({ status: "cancelled", completedAt: new Date() })
    .where(eq(deskWorkflowRuns.id, runId));

  revalidatePath(`/${locale}/admin/runs`);
  revalidatePath(`/${locale}/admin/runs/${runId}`);
  redirect(`/${locale}/admin/runs`);
}
