// ==================== Notification Types ====================

export type NotificationType =
  | "print_done"
  | "material_change"
  | "part_removal"
  | "maintenance_required"
  | "error_check"
  | "post_processing"
  | "printer_assigned"
  | "feasibility_warning"
  | "sls_pack_ready";

export type NotificationSeverity = "info" | "warning" | "critical";

export interface NotificationPayload {
  type: NotificationType;
  severity: NotificationSeverity;
  title: string;
  message: string;
  printerId?: string;
  jobId?: string;
  assignedTo?: string;
  metadata?: Record<string, unknown>;
}

// Type-safe payloads per notification type
export interface PrintDonePayload extends NotificationPayload {
  type: "print_done";
  metadata: {
    jobName: string;
    printerName: string;
    printTime?: number;
    materialUsed?: number;
  };
}

export interface MaterialChangePayload extends NotificationPayload {
  type: "material_change";
  metadata: {
    materialName: string;
    printerName: string;
    requiredMaterial: string;
    currentMaterial?: string;
  };
}

export interface PartRemovalPayload extends NotificationPayload {
  type: "part_removal";
  metadata: {
    jobName: string;
    printerName: string;
    modelName: string;
  };
}

export interface MaintenanceRequiredPayload extends NotificationPayload {
  type: "maintenance_required";
  metadata: {
    printerName: string;
    taskName: string;
    dueAt?: string;
    overdue?: boolean;
  };
}

export interface ErrorCheckPayload extends NotificationPayload {
  type: "error_check";
  metadata: {
    printerName: string;
    errorMessage: string;
    jobName?: string;
  };
}

export interface PostProcessingPayload extends NotificationPayload {
  type: "post_processing";
  metadata: {
    jobName: string;
    printerName: string;
    step: "washing" | "curing" | "cooling" | "depowdering";
    technology: "sla" | "sls";
  };
}

export interface PrinterAssignedPayload extends NotificationPayload {
  type: "printer_assigned";
  metadata: {
    jobName: string;
    printerName: string;
    score: number;
    reason: string;
  };
}

export interface FeasibilityWarningPayload extends NotificationPayload {
  type: "feasibility_warning";
  metadata: {
    modelName: string;
    verdict: string;
    technology: string;
    issueCount: number;
  };
}

export interface SlsPackReadyPayload extends NotificationPayload {
  type: "sls_pack_ready";
  metadata: {
    packingJobName: string;
    printerName: string;
    partCount: number;
    utilization: number;
  };
}

export type TypedNotificationPayload =
  | PrintDonePayload
  | MaterialChangePayload
  | PartRemovalPayload
  | MaintenanceRequiredPayload
  | ErrorCheckPayload
  | PostProcessingPayload
  | PrinterAssignedPayload
  | FeasibilityWarningPayload
  | SlsPackReadyPayload;

// Default severity per notification type
export const DEFAULT_SEVERITY: Record<NotificationType, NotificationSeverity> = {
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
