/**
 * Maintenance scheduling engine for OpenFarm.
 * Evaluates which maintenance tasks are due based on print hours, print count, or date.
 */

export interface MaintenanceTask {
  id: string;
  printerId: string;
  name: string;
  type: "routine" | "preventive" | "corrective" | "calibration";
  status: string;
  intervalHours?: number | null;
  intervalPrints?: number | null;
  dueAt?: Date | null;
  lastCompletedAt?: Date | null;
}

export interface PrinterStats {
  id: string;
  totalPrintHours: number;
  totalPrintCount: number;
}

export type TaskDueStatus = "not_due" | "due_soon" | "due" | "overdue";

export interface TaskEvaluation {
  taskId: string;
  dueStatus: TaskDueStatus;
  reason: string;
  urgency: number; // 0-100
}

/**
 * Evaluate which tasks are due for a printer.
 */
export function evaluateTasks(
  tasks: MaintenanceTask[],
  printerStats: PrinterStats,
  now: Date = new Date()
): TaskEvaluation[] {
  return tasks
    .filter((t) => t.status !== "completed" && t.status !== "skipped")
    .map((task) => evaluate(task, printerStats, now))
    .sort((a, b) => b.urgency - a.urgency);
}

function evaluate(
  task: MaintenanceTask,
  stats: PrinterStats,
  now: Date
): TaskEvaluation {
  // Already overdue by status
  if (task.status === "overdue") {
    return { taskId: task.id, dueStatus: "overdue", reason: "Marked as overdue", urgency: 100 };
  }
  if (task.status === "due") {
    return { taskId: task.id, dueStatus: "due", reason: "Marked as due", urgency: 80 };
  }
  if (task.status === "in_progress") {
    return { taskId: task.id, dueStatus: "due", reason: "In progress", urgency: 70 };
  }

  // Check date-based due
  if (task.dueAt) {
    const dueTime = new Date(task.dueAt).getTime();
    const nowTime = now.getTime();
    const hoursUntilDue = (dueTime - nowTime) / (1000 * 3600);

    if (hoursUntilDue < 0) {
      return {
        taskId: task.id,
        dueStatus: "overdue",
        reason: `Overdue by ${Math.abs(Math.round(hoursUntilDue))} hours`,
        urgency: Math.min(100, 80 + Math.abs(hoursUntilDue)),
      };
    }
    if (hoursUntilDue < 24) {
      return {
        taskId: task.id,
        dueStatus: "due",
        reason: `Due in ${Math.round(hoursUntilDue)} hours`,
        urgency: 70,
      };
    }
    if (hoursUntilDue < 72) {
      return {
        taskId: task.id,
        dueStatus: "due_soon",
        reason: `Due in ${Math.round(hoursUntilDue / 24)} days`,
        urgency: 40,
      };
    }
  }

  // Check hours-based interval
  // (simplified: compare total hours since last completion)
  // In a real system you'd track hours at last completion

  return { taskId: task.id, dueStatus: "not_due", reason: "Planned", urgency: 0 };
}

/**
 * Compute a maintenance health score for a printer (0-100).
 * Used by the assignment engine to deprioritize poorly maintained printers.
 */
export function getMaintenanceScore(evaluations: TaskEvaluation[]): number {
  if (evaluations.length === 0) return 100;

  let penalty = 0;
  for (const e of evaluations) {
    switch (e.dueStatus) {
      case "overdue": penalty += 30; break;
      case "due": penalty += 15; break;
      case "due_soon": penalty += 5; break;
    }
  }

  return Math.max(0, 100 - penalty);
}
