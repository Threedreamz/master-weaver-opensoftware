"use client";

import { useState } from "react";
import { useNotifications } from "@/hooks/use-notifications";
import {
  Bell,
  Check,
  CheckCheck,
  X,
  AlertTriangle,
  AlertCircle,
  Info,
  Printer,
  Package,
  Wrench,
  Zap,
} from "lucide-react";
import { useTranslations } from "next-intl";

interface Notification {
  id: string;
  type: string;
  severity: string;
  title: string;
  message: string;
  printerId?: string | null;
  jobId?: string | null;
  metadata?: Record<string, unknown> | null;
  readAt?: Date | null;
  dismissedAt?: Date | null;
  createdAt: Date;
  printer?: { id: string; name: string } | null;
  job?: { id: string; name: string } | null;
}

const SEVERITY_STYLES = {
  critical: "border-l-red-500 bg-red-50 dark:bg-red-950/20",
  warning: "border-l-amber-500 bg-amber-50 dark:bg-amber-950/20",
  info: "border-l-blue-500 bg-blue-50 dark:bg-blue-950/20",
};

const SEVERITY_ICONS = {
  critical: <AlertCircle className="w-5 h-5 text-red-500" />,
  warning: <AlertTriangle className="w-5 h-5 text-amber-500" />,
  info: <Info className="w-5 h-5 text-blue-500" />,
};

const TYPE_ICONS: Record<string, React.ReactNode> = {
  print_done: <Check className="w-4 h-4" />,
  material_change: <Package className="w-4 h-4" />,
  part_removal: <Package className="w-4 h-4" />,
  maintenance_required: <Wrench className="w-4 h-4" />,
  error_check: <AlertCircle className="w-4 h-4" />,
  post_processing: <Zap className="w-4 h-4" />,
  printer_assigned: <Printer className="w-4 h-4" />,
};

function formatTimeAgo(date: Date | string): string {
  const now = Date.now();
  const then = new Date(date).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60000);
  const diffHour = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  return `${diffDay}d ago`;
}

export function NotificationCenter({
  initialNotifications,
}: {
  initialNotifications: Notification[];
}) {
  const t = useTranslations("notifications");
  const { notifications, unreadCount, markRead, dismiss, markAllRead } =
    useNotifications(10000);
  const [filter, setFilter] = useState<"all" | "unread" | "critical">("all");

  const displayNotifications = (notifications.length > 0 ? notifications : initialNotifications);

  const filtered = displayNotifications.filter((n) => {
    if (n.dismissedAt) return false;
    if (filter === "unread") return !n.readAt;
    if (filter === "critical") return n.severity === "critical";
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setFilter("all")}
          className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
            filter === "all"
              ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400"
          }`}
        >
          {t("filterAll")}
        </button>
        <button
          onClick={() => setFilter("unread")}
          className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
            filter === "unread"
              ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400"
          }`}
        >
          {t("filterUnread")} {unreadCount > 0 && `(${unreadCount})`}
        </button>
        <button
          onClick={() => setFilter("critical")}
          className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
            filter === "critical"
              ? "bg-red-600 text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400"
          }`}
        >
          {t("filterCritical")}
        </button>
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            className="ml-auto flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
          >
            <CheckCheck className="w-4 h-4" />
            {t("markAllRead")}
          </button>
        )}
      </div>

      {/* Notification list */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <Bell className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>{t("noNotifications")}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((notification) => (
            <div
              key={notification.id}
              className={`border-l-4 rounded-lg p-4 transition-opacity ${
                SEVERITY_STYLES[notification.severity as keyof typeof SEVERITY_STYLES] ?? SEVERITY_STYLES.info
              } ${notification.readAt ? "opacity-60" : ""}`}
            >
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-0.5">
                  {SEVERITY_ICONS[notification.severity as keyof typeof SEVERITY_ICONS] ?? SEVERITY_ICONS.info}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-gray-900 dark:text-white text-sm">
                      {notification.title}
                    </h3>
                    <span className="flex items-center gap-1 text-xs text-gray-500 bg-gray-200/50 dark:bg-gray-700/50 rounded px-1.5 py-0.5">
                      {TYPE_ICONS[notification.type]}
                      {t(`types.${notification.type}`)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mt-0.5">
                    {notification.message}
                  </p>
                  <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                    <span>{formatTimeAgo(notification.createdAt)}</span>
                    {notification.printer && (
                      <span className="flex items-center gap-1">
                        <Printer className="w-3 h-3" />
                        {notification.printer.name}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {!notification.readAt && (
                    <button
                      onClick={() => markRead(notification.id)}
                      className="p-1.5 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950/30"
                      title={t("markRead")}
                    >
                      <Check className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => dismiss(notification.id)}
                    className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30"
                    title={t("dismiss")}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
