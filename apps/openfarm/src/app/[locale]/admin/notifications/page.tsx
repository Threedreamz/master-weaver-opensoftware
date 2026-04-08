import { getNotifications, getUnreadCount } from "@/db/queries/notifications";
import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";
import { NotificationCenter } from "@/components/admin/NotificationCenter";

export const dynamic = "force-dynamic";

export default async function NotificationsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("notifications");

  const notifications = await getNotifications({ limit: 100 });
  const unreadCount = await getUnreadCount();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t("title")}</h1>
          <p className="text-sm text-gray-500 mt-1">
            {unreadCount > 0 ? t("unreadCount", { count: unreadCount }) : t("allRead")}
          </p>
        </div>
      </div>

      <NotificationCenter initialNotifications={notifications} />
    </div>
  );
}
