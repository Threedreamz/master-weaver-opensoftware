import type { Job } from "bullmq";
import { db } from "@opensoftware/openmailer-db";
import {
  automations,
  automationSteps,
  automationEnrollments,
  contacts,
  emailTemplates,
  campaignEvents,
} from "@opensoftware/openmailer-db/schema";
import { renderTemplate } from "@opensoftware/openmailer-email";
import { eq, and, isNull } from "drizzle-orm";
import { randomUUID } from "crypto";
import { sendEmail } from "../services/email-sender.js";

export interface ProcessAutomationJob {
  workspaceId: string;
  automationId: string;
  /** If provided, only process this specific enrollment. Otherwise process all active enrollments. */
  enrollmentId?: string;
}

/**
 * Automation step types:
 * - send_email: Send an email to the enrolled contact
 * - wait: Pause for a configured duration before advancing
 * - condition: Evaluate a condition and branch accordingly
 */
interface StepConfig {
  /** For send_email: template ID to send */
  templateId?: string;
  /** For send_email: from name override */
  fromName?: string;
  /** For send_email: from email override */
  fromEmail?: string;
  /** For send_email: subject override */
  subject?: string;
  /** For wait: duration in milliseconds */
  waitDuration?: number;
  /** For condition: field to check */
  conditionField?: string;
  /** For condition: operator */
  conditionOperator?: string;
  /** For condition: value to compare */
  conditionValue?: string;
}

/**
 * Process automation enrollments.
 *
 * Workflow:
 * 1. Load the automation and verify it is active
 * 2. Fetch all active enrollments (or a specific one)
 * 3. For each enrollment, execute the current step
 * 4. Advance to the next step or complete the enrollment
 */
export async function processAutomation(job: Job<ProcessAutomationJob>) {
  const { workspaceId, automationId, enrollmentId } = job.data;
  console.log(`[automation] Processing automation ${automationId}`);

  // -- 1. Load automation -----------------------------------------------------
  const [automation] = await db
    .select()
    .from(automations)
    .where(
      and(
        eq(automations.id, automationId),
        eq(automations.workspaceId, workspaceId)
      )
    );

  if (!automation) {
    throw new Error(`Automation ${automationId} not found`);
  }

  if (automation.status !== "active") {
    console.log(
      `[automation] Automation ${automationId} is not active (status: ${automation.status}), skipping`
    );
    return;
  }

  // -- 2. Load all steps for this automation (ordered by position) ------------
  const steps = await db
    .select()
    .from(automationSteps)
    .where(eq(automationSteps.automationId, automationId));

  if (steps.length === 0) {
    console.log(`[automation] Automation ${automationId} has no steps`);
    return;
  }

  // Build a map for quick step lookup
  const stepMap = new Map(steps.map((s) => [s.id, s]));

  // Find the root step (no parent)
  const rootStep = steps.find((s) => s.parentStepId === null);

  // -- 3. Load enrollments to process -----------------------------------------
  let enrollments;
  if (enrollmentId) {
    enrollments = await db
      .select()
      .from(automationEnrollments)
      .where(
        and(
          eq(automationEnrollments.id, enrollmentId),
          eq(automationEnrollments.automationId, automationId),
          eq(automationEnrollments.status, "active")
        )
      );
  } else {
    enrollments = await db
      .select()
      .from(automationEnrollments)
      .where(
        and(
          eq(automationEnrollments.automationId, automationId),
          eq(automationEnrollments.status, "active")
        )
      );
  }

  if (enrollments.length === 0) {
    console.log(`[automation] No active enrollments for automation ${automationId}`);
    return;
  }

  // -- 4. Process each enrollment ---------------------------------------------
  let processed = 0;
  let errors = 0;

  for (const enrollment of enrollments) {
    try {
      // Determine which step to execute
      const currentStepId = enrollment.currentStepId;
      let currentStep;

      if (currentStepId) {
        currentStep = stepMap.get(currentStepId);
      } else {
        // New enrollment: start at root step
        currentStep = rootStep;
      }

      if (!currentStep) {
        // No step to execute: mark enrollment as completed
        await db
          .update(automationEnrollments)
          .set({ status: "completed" })
          .where(eq(automationEnrollments.id, enrollment.id));
        processed++;
        continue;
      }

      // Load the contact
      const [contact] = await db
        .select()
        .from(contacts)
        .where(eq(contacts.id, enrollment.contactId));

      if (!contact || contact.status !== "active") {
        // Contact no longer active: mark enrollment as cancelled
        await db
          .update(automationEnrollments)
          .set({ status: "cancelled" })
          .where(eq(automationEnrollments.id, enrollment.id));
        processed++;
        continue;
      }

      // Execute the current step
      const stepConfig = (currentStep.config as StepConfig) || {};
      const shouldAdvance = await executeStep(
        currentStep.type,
        stepConfig,
        workspaceId,
        contact,
        enrollment,
        automationId
      );

      if (shouldAdvance) {
        // Find the next step
        const nextStep = findNextStep(currentStep, steps, stepConfig, contact);

        if (nextStep) {
          await db
            .update(automationEnrollments)
            .set({ currentStepId: nextStep.id as string })
            .where(eq(automationEnrollments.id, enrollment.id));
        } else {
          // No more steps: enrollment is complete
          await db
            .update(automationEnrollments)
            .set({ status: "completed", currentStepId: currentStep.id })
            .where(eq(automationEnrollments.id, enrollment.id));
        }
      }

      processed++;
    } catch (err) {
      console.error(
        `[automation] Error processing enrollment ${enrollment.id}:`,
        err instanceof Error ? err.message : err
      );
      errors++;
    }

    // Update progress
    const idx = enrollments.indexOf(enrollment);
    await job.updateProgress(
      Math.round(((idx + 1) / enrollments.length) * 100)
    );
  }

  console.log(
    `[automation] Automation ${automationId}: processed ${processed}, errors ${errors}`
  );
}

/**
 * Execute a single automation step.
 * Returns true if the enrollment should advance to the next step.
 */
async function executeStep(
  stepType: string,
  config: StepConfig,
  workspaceId: string,
  contact: Record<string, unknown>,
  enrollment: Record<string, unknown>,
  automationId: string
): Promise<boolean> {
  switch (stepType) {
    case "send_email":
      return executeEmailStep(config, workspaceId, contact, automationId);

    case "wait":
      return executeWaitStep(config, enrollment);

    case "condition":
      // Conditions always advance (the branching is handled in findNextStep)
      return true;

    default:
      console.warn(`[automation] Unknown step type: ${stepType}`);
      return true;
  }
}

/**
 * Send an email as part of an automation step.
 */
async function executeEmailStep(
  config: StepConfig,
  workspaceId: string,
  contact: Record<string, unknown>,
  automationId: string
): Promise<boolean> {
  if (!config.templateId) {
    console.warn("[automation] send_email step has no templateId configured");
    return true;
  }

  // Load template
  const [template] = await db
    .select()
    .from(emailTemplates)
    .where(eq(emailTemplates.id, config.templateId));

  if (!template) {
    console.warn(
      `[automation] Template ${config.templateId} not found, skipping`
    );
    return true;
  }

  const contactData = {
    email: contact.email as string,
    firstName: (contact.firstName as string) ?? undefined,
    lastName: (contact.lastName as string) ?? undefined,
    customFields:
      (contact.customFields as Record<string, unknown>) ?? {},
  };

  const renderedHtml = renderTemplate(template.htmlBody, contactData);
  const renderedSubject = renderTemplate(
    config.subject || template.subject,
    contactData
  );

  try {
    await sendEmail({
      workspaceId,
      to: contact.email as string,
      subject: renderedSubject,
      html: renderedHtml,
      from: {
        name: config.fromName || "OpenMailer",
        email: config.fromEmail || "noreply@openmailer.org",
      },
    });

    console.log(
      `[automation] Sent email to ${contact.email} (automation ${automationId})`
    );
  } catch (err) {
    console.error(
      `[automation] Failed to send email to ${contact.email}:`,
      err instanceof Error ? err.message : err
    );
  }

  return true;
}

/**
 * Handle a wait step. Returns true if the wait duration has elapsed.
 */
function executeWaitStep(
  config: StepConfig,
  enrollment: Record<string, unknown>
): boolean {
  const waitDuration = config.waitDuration || 0;

  if (waitDuration <= 0) return true;

  // Check if enough time has passed since enrollment or last step change.
  // For simplicity, we use enrolledAt as the reference point.
  const enrolledAt = enrollment.enrolledAt as Date;
  if (!enrolledAt) return true;

  const elapsed = Date.now() - new Date(enrolledAt).getTime();
  return elapsed >= waitDuration;
}

/**
 * Find the next step after the current one.
 * For condition steps, evaluates the condition and picks the correct branch.
 */
function findNextStep(
  currentStep: Record<string, unknown>,
  allSteps: Record<string, unknown>[],
  config: StepConfig,
  contact: Record<string, unknown>
): Record<string, unknown> | null {
  const currentStepId = currentStep.id as string;

  // For condition steps, determine which branch to follow
  if (currentStep.type === "condition") {
    const conditionMet = evaluateStepCondition(config, contact);
    const targetBranch = conditionMet ? "true" : "false";

    const branchStep = allSteps.find(
      (s) =>
        s.parentStepId === currentStepId && s.branch === targetBranch
    );

    if (branchStep) return branchStep;
  }

  // Default: find the next child step with "default" branch
  const nextStep = allSteps.find(
    (s) =>
      s.parentStepId === currentStepId &&
      (s.branch === "default" || !s.branch)
  );

  return nextStep || null;
}

/**
 * Evaluate a condition step's condition against a contact.
 */
function evaluateStepCondition(
  config: StepConfig,
  contact: Record<string, unknown>
): boolean {
  const { conditionField, conditionOperator, conditionValue } = config;

  if (!conditionField || !conditionOperator) return false;

  let fieldValue: unknown;
  if (conditionField.startsWith("custom.")) {
    const customKey = conditionField.slice(7);
    const customFields = contact.customFields as Record<string, unknown> | null;
    fieldValue = customFields?.[customKey];
  } else {
    fieldValue = contact[conditionField];
  }

  const strValue = fieldValue != null ? String(fieldValue) : "";
  const compareValue = conditionValue ?? "";

  switch (conditionOperator) {
    case "equals":
      return strValue.toLowerCase() === compareValue.toLowerCase();
    case "not_equals":
      return strValue.toLowerCase() !== compareValue.toLowerCase();
    case "contains":
      return strValue.toLowerCase().includes(compareValue.toLowerCase());
    case "greater_than":
      return Number(strValue) > Number(compareValue);
    case "less_than":
      return Number(strValue) < Number(compareValue);
    case "is_set":
      return fieldValue != null && fieldValue !== "";
    case "is_not_set":
      return fieldValue == null || fieldValue === "";
    default:
      return false;
  }
}
