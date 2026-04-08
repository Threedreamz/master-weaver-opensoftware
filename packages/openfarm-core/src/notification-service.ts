import type {
  NotificationType,
  NotificationSeverity,
  NotificationPayload,
  TypedNotificationPayload,
} from "./notification-types";
import { DEFAULT_SEVERITY } from "./notification-types";

/**
 * Build a notification payload with defaults applied.
 */
export function buildNotification(
  partial: Omit<NotificationPayload, "severity"> & { severity?: NotificationSeverity }
): NotificationPayload {
  return {
    severity: DEFAULT_SEVERITY[partial.type],
    ...partial,
  };
}

/**
 * Build a typed notification payload with type safety.
 */
export function buildTypedNotification<T extends TypedNotificationPayload>(
  payload: Omit<T, "severity"> & { severity?: NotificationSeverity }
): T {
  return {
    severity: DEFAULT_SEVERITY[payload.type],
    ...payload,
  } as T;
}

/**
 * Check if a notification type should be sent based on user preferences.
 */
export function shouldNotify(
  preferences: Array<{ notificationType: string; enabled: boolean }>,
  type: NotificationType
): boolean {
  const pref = preferences.find((p) => p.notificationType === type);
  // Default to enabled if no preference is set
  return pref ? pref.enabled : true;
}

/**
 * Get a human-readable action label for a notification type.
 * Used for i18n key mapping.
 */
export function getNotificationAction(type: NotificationType): string {
  const actions: Record<NotificationType, string> = {
    print_done: "remove_part",
    material_change: "change_material",
    part_removal: "remove_part",
    maintenance_required: "perform_maintenance",
    error_check: "check_error",
    post_processing: "start_post_processing",
    printer_assigned: "review_assignment",
    feasibility_warning: "review_feasibility",
    sls_pack_ready: "review_packing",
  };
  return actions[type];
}

/**
 * Sort notifications by priority: critical > warning > info, then by date desc.
 */
export function sortNotifications<T extends { severity: NotificationSeverity; createdAt: Date | number }>(
  notifications: T[]
): T[] {
  const severityOrder: Record<NotificationSeverity, number> = {
    critical: 0,
    warning: 1,
    info: 2,
  };
  return [...notifications].sort((a, b) => {
    const sevDiff = severityOrder[a.severity] - severityOrder[b.severity];
    if (sevDiff !== 0) return sevDiff;
    const aTime = a.createdAt instanceof Date ? a.createdAt.getTime() : a.createdAt;
    const bTime = b.createdAt instanceof Date ? b.createdAt.getTime() : b.createdAt;
    return bTime - aTime;
  });
}
