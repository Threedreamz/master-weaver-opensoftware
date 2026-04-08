/**
 * Notification emit helpers for OpenFarm.
 * Call these from server actions, API routes, or background jobs to create notifications.
 */
import { createNotification } from "@/db/queries/notifications";

type NotificationType =
  | "print_done"
  | "material_change"
  | "part_removal"
  | "maintenance_required"
  | "error_check"
  | "post_processing"
  | "printer_assigned"
  | "feasibility_warning"
  | "sls_pack_ready";

type Severity = "info" | "warning" | "critical";

const DEFAULT_SEVERITY: Record<NotificationType, Severity> = {
  print_done: "info",
  material_change: "warning",
  part_removal: "info",
  maintenance_required: "warning",
  error_check: "critical",
  post_processing: "info",
  printer_assigned: "info",
  feasibility_warning: "warning",
  sls_pack_ready: "info",
};

/**
 * Emit a notification. Fire-and-forget — errors are logged but not thrown.
 */
export async function notify(params: {
  type: NotificationType;
  title: string;
  message: string;
  severity?: Severity;
  printerId?: string;
  jobId?: string;
  assignedTo?: string;
  metadata?: Record<string, unknown>;
}) {
  try {
    await createNotification({
      type: params.type,
      severity: params.severity ?? DEFAULT_SEVERITY[params.type],
      title: params.title,
      message: params.message,
      printerId: params.printerId,
      jobId: params.jobId,
      assignedTo: params.assignedTo,
      metadata: params.metadata,
    });
  } catch (error) {
    console.error("[notify] Failed to create notification:", error);
  }
}

// ==================== Convenience Helpers ====================

export async function notifyPrintDone(job: { id: string; name: string }, printer: { id: string; name: string }) {
  await notify({
    type: "print_done",
    title: `Print complete: ${job.name}`,
    message: `${job.name} has finished printing on ${printer.name}. Remove the part.`,
    printerId: printer.id,
    jobId: job.id,
    metadata: { jobName: job.name, printerName: printer.name },
  });
}

export async function notifyPrintError(
  job: { id: string; name: string },
  printer: { id: string; name: string },
  errorMessage: string
) {
  await notify({
    type: "error_check",
    title: `Print error: ${printer.name}`,
    message: `${job.name} on ${printer.name}: ${errorMessage}`,
    printerId: printer.id,
    jobId: job.id,
    metadata: { jobName: job.name, printerName: printer.name, errorMessage },
  });
}

export async function notifyPostProcessing(
  job: { id: string; name: string },
  printer: { id: string; name: string },
  step: "washing" | "curing" | "cooling" | "depowdering",
  technology: "sla" | "sls"
) {
  await notify({
    type: "post_processing",
    title: `Post-processing: ${job.name}`,
    message: `${job.name} on ${printer.name} requires ${step}.`,
    printerId: printer.id,
    jobId: job.id,
    metadata: { jobName: job.name, printerName: printer.name, step, technology },
  });
}

export async function notifyMaterialLow(material: { name: string; remainingPercent: number }) {
  await notify({
    type: "material_change",
    severity: material.remainingPercent < 10 ? "critical" : "warning",
    title: `Low material: ${material.name}`,
    message: `${material.name} is at ${material.remainingPercent}% stock.`,
    metadata: { materialName: material.name, remainingPercent: material.remainingPercent },
  });
}
