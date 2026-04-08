import type { JobStatus, JobTransition, PrintTechnology } from "./types";

const TRANSITIONS: JobTransition[] = [
  // Common pipeline start
  { from: "queued", to: "slicing", technology: "all", action: "Start Slicing", automatic: true },
  { from: "slicing", to: "post_processing", technology: "fdm", action: "Post-Process", automatic: true },
  { from: "slicing", to: "ready", technology: "sla", action: "Ready to Print", automatic: true },
  { from: "slicing", to: "ready", technology: "sls", action: "Ready to Print", automatic: true },
  { from: "slicing", to: "failed", technology: "all", action: "Slicing Failed", automatic: true },
  { from: "post_processing", to: "ready", technology: "fdm", action: "Ready to Print", automatic: true },
  { from: "post_processing", to: "failed", technology: "all", action: "Post-Processing Failed", automatic: true },
  // Send + print
  { from: "ready", to: "sending", technology: "all", action: "Send to Printer", automatic: false },
  { from: "sending", to: "printing", technology: "all", action: "Begin Print", automatic: true },
  { from: "sending", to: "failed", technology: "all", action: "Send Failed", automatic: true },
  { from: "printing", to: "paused", technology: "all", action: "Pause", automatic: false },
  { from: "paused", to: "printing", technology: "all", action: "Resume", automatic: false },
  { from: "printing", to: "failed", technology: "all", action: "Print Failed", automatic: true },
  // FDM terminal
  { from: "printing", to: "completed", technology: "fdm", action: "Print Complete", automatic: true },
  // SLA post-print
  { from: "printing", to: "washing", technology: "sla", action: "Begin Wash", automatic: false },
  { from: "washing", to: "curing", technology: "sla", action: "Begin Cure", automatic: false },
  { from: "curing", to: "completed", technology: "sla", action: "Curing Complete", automatic: true },
  { from: "washing", to: "failed", technology: "sla", action: "Wash Failed", automatic: true },
  { from: "curing", to: "failed", technology: "sla", action: "Cure Failed", automatic: true },
  // SLS post-print
  { from: "printing", to: "cooling", technology: "sls", action: "Begin Cooldown", automatic: true },
  { from: "cooling", to: "depowdering", technology: "sls", action: "Begin Depowdering", automatic: false },
  { from: "depowdering", to: "completed", technology: "sls", action: "Depowdering Complete", automatic: false },
  { from: "cooling", to: "failed", technology: "sls", action: "Cooldown Failed", automatic: true },
  { from: "depowdering", to: "failed", technology: "sls", action: "Depowdering Failed", automatic: true },
  // Cancel from any active state
  { from: "queued", to: "cancelled", technology: "all", action: "Cancel", automatic: false },
  { from: "slicing", to: "cancelled", technology: "all", action: "Cancel", automatic: false },
  { from: "post_processing", to: "cancelled", technology: "all", action: "Cancel", automatic: false },
  { from: "ready", to: "cancelled", technology: "all", action: "Cancel", automatic: false },
  { from: "sending", to: "cancelled", technology: "all", action: "Cancel", automatic: false },
  { from: "printing", to: "cancelled", technology: "all", action: "Cancel", automatic: false },
  { from: "paused", to: "cancelled", technology: "all", action: "Cancel", automatic: false },
];

export function getValidTransitions(currentStatus: JobStatus, technology: PrintTechnology): JobTransition[] {
  return TRANSITIONS.filter(
    (t) => t.from === currentStatus && (t.technology === "all" || t.technology === technology)
  );
}

export function canTransition(from: JobStatus, to: JobStatus, technology: PrintTechnology): boolean {
  return TRANSITIONS.some(
    (t) => t.from === from && t.to === to && (t.technology === "all" || t.technology === technology)
  );
}

const TERMINAL_STATUSES: JobStatus[] = ["completed", "failed", "cancelled"];

export function isTerminalStatus(status: JobStatus): boolean {
  return TERMINAL_STATUSES.includes(status);
}

export function getNextAutomaticTransition(status: JobStatus, technology: PrintTechnology): JobTransition | null {
  const transitions = getValidTransitions(status, technology);
  return transitions.find((t) => t.automatic) ?? null;
}

export { TRANSITIONS };
