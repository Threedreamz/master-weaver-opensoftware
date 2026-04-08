import { cn } from "../lib/utils";

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  draft: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
  pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  sent: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  received: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  published: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  approved: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  archived: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  error: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  failed: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  warning: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
  critical: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  info: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  bezahlt: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  entwurf: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
  gesendet: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  storniert: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  ueberfaellig: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
  // Booking statuses
  vorschlag: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  geprueft: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  exportiert: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  // Document statuses
  uploaded: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
  processing: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  processed: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  // Match statuses
  confirmed: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  rejected: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  // Customer statuses
  inactive: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
};

interface StatusBadgeProps {
  status: string;
  className?: string;
  children?: React.ReactNode;
}

export function StatusBadge({ status, className, children }: StatusBadgeProps) {
  const colorClass = STATUS_COLORS[status.toLowerCase()] ?? STATUS_COLORS.draft;
  return (
    <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium", colorClass, className)}>
      {children ?? status}
    </span>
  );
}
