import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { Box, Image, Droplets, Settings } from "lucide-react";

interface AdminDashboardProps {
  params: Promise<{ locale: string }>;
}

export default async function AdminDashboardPage({ params }: AdminDashboardProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("dashboard");

  const sections = [
    {
      title: t("fdmSlicing"),
      description: t("fdmSlicingDescription"),
      href: `/${locale}/admin/slice`,
      icon: <Box size={20} />,
      color: "bg-blue-50 text-blue-700 border-blue-200",
    },
    {
      title: t("litophane"),
      description: t("litophaneDescription"),
      href: `/${locale}/admin/litophane`,
      icon: <Image size={20} />,
      color: "bg-emerald-50 text-emerald-700 border-emerald-200",
    },
    {
      title: t("slaSlicing"),
      description: t("slaSlicingDescription"),
      href: `/${locale}/admin/sla`,
      icon: <Droplets size={20} />,
      color: "bg-purple-50 text-purple-700 border-purple-200",
    },
    {
      title: t("profiles"),
      description: t("profilesDescription"),
      href: `/${locale}/admin/profiles`,
      icon: <Settings size={20} />,
      color: "bg-gray-50 text-gray-700 border-gray-200",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t("title")}</h1>
        <p className="text-sm text-gray-500 mt-1">
          {t("subtitle")}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {sections.map((section) => (
          <Link
            key={section.href}
            href={section.href}
            className={`rounded-xl border p-5 ${section.color} hover:shadow-md transition-shadow`}
          >
            <div className="flex items-center gap-3 mb-2">
              <span className="opacity-60">{section.icon}</span>
              <h2 className="text-lg font-semibold">{section.title}</h2>
            </div>
            <p className="text-sm opacity-80">{section.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
