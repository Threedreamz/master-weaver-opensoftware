export type DueDateStatus = "overdue" | "soon" | "normal" | null;

const SOON_THRESHOLD_MS = 48 * 60 * 60 * 1000; // 48 hours

export function getDueDateStatus(faelligAm: Date | null): DueDateStatus {
  if (!faelligAm) return null;

  const now = Date.now();
  const due = faelligAm.getTime();

  if (due < now) return "overdue";
  if (due - now < SOON_THRESHOLD_MS) return "soon";
  return "normal";
}

export function formatDate(date: Date | null): string {
  if (!date) return "";
  return date.toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}
