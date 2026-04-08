import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { db } from "@/db";
import { deskVorgangModules } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { ArrowLeft, AlertCircle } from "lucide-react";

interface ModuleBoardPageProps {
  params: Promise<{ locale: string; id: string }>;
}

const priorityBadge: Record<string, string> = {
  low: "bg-gray-100 text-gray-600",
  medium: "bg-yellow-100 text-yellow-700",
  high: "bg-orange-100 text-orange-700",
  critical: "bg-red-100 text-red-700",
};

export default async function ModuleBoardPage({ params }: ModuleBoardPageProps) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("modules");
  const tc = await getTranslations("common");

  const mod = await db.query.deskModules.findFirst({
    where: (m, { eq }) => eq(m.id, id),
    with: {
      statuses: {
        orderBy: (s, { asc }) => [asc(s.sortOrder)],
      },
    },
  });

  if (!mod) {
    notFound();
  }

  const vorgangModules = await db.query.deskVorgangModules.findMany({
    where: and(
      eq(deskVorgangModules.moduleId, id),
      eq(deskVorgangModules.isActive, true)
    ),
    with: {
      vorgang: true,
      moduleStatus: true,
    },
  });

  // Group by status
  const statusGroups: Record<
    string,
    typeof vorgangModules
  > = {};

  // Initialize all status groups
  for (const status of mod.statuses) {
    statusGroups[status.id] = [];
  }
  statusGroups["__no_status__"] = [];

  for (const vm of vorgangModules) {
    const key = vm.moduleStatusId ?? "__no_status__";
    if (!statusGroups[key]) {
      statusGroups[key] = [];
    }
    statusGroups[key].push(vm);
  }

  const columns = [
    ...mod.statuses.map((s) => ({
      id: s.id,
      name: s.name,
      color: s.color,
      isFinal: s.isFinal,
      items: statusGroups[s.id] ?? [],
    })),
    ...(statusGroups["__no_status__"].length > 0
      ? [
          {
            id: "__no_status__",
            name: "Ohne Status",
            color: null,
            isFinal: false,
            items: statusGroups["__no_status__"],
          },
        ]
      : []),
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href={`/${locale}/admin/modules/${mod.id}`}
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          <ArrowLeft size={16} />
          {tc("back")}
        </Link>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold"
            style={{ backgroundColor: mod.color || "#6366f1" }}
          >
            {mod.icon ? mod.icon.slice(0, 2).toUpperCase() : mod.name.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {mod.name} — {t("board")}
            </h1>
            <p className="text-sm text-gray-500">
              {vorgangModules.length} aktive Vorgänge
            </p>
          </div>
        </div>
      </div>

      {columns.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
          <AlertCircle size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500 font-medium">{t("noStatuses")}</p>
          <Link
            href={`/${locale}/admin/modules/${mod.id}`}
            className="inline-flex items-center gap-2 mt-4 text-sm text-indigo-600 hover:text-indigo-800 transition-colors"
          >
            {t("addStatus")}
          </Link>
        </div>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {columns.map((column) => (
            <div
              key={column.id}
              className="flex-shrink-0 w-72 rounded-xl border border-gray-200 bg-white overflow-hidden"
            >
              {/* Column header */}
              <div
                className="px-4 py-3 border-b border-gray-100 flex items-center justify-between"
                style={{
                  borderTopWidth: 3,
                  borderTopStyle: "solid",
                  borderTopColor: column.color || "#e5e7eb",
                }}
              >
                <div className="flex items-center gap-2">
                  {column.color && (
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: column.color }}
                    />
                  )}
                  <span className="font-semibold text-sm text-gray-900">{column.name}</span>
                  {column.isFinal && (
                    <span className="text-xs font-medium px-1.5 py-0.5 rounded bg-red-100 text-red-600">
                      Final
                    </span>
                  )}
                </div>
                <span className="text-xs font-medium text-gray-400 bg-gray-100 rounded-full px-2 py-0.5">
                  {column.items.length}
                </span>
              </div>

              {/* Cards */}
              <div className="p-3 space-y-2 min-h-[120px]">
                {column.items.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-4">Keine Vorgänge</p>
                ) : (
                  column.items.map((vm) => (
                    <Link
                      key={vm.id}
                      href={`/${locale}/admin/vorgaenge/${vm.vorgangId}`}
                      className="block rounded-lg border border-gray-100 bg-gray-50 hover:bg-indigo-50 hover:border-indigo-200 p-3 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <span className="font-mono text-xs text-indigo-600 font-semibold">
                          {vm.vorgang.globalId}
                        </span>
                        <span
                          className={`inline-block text-xs font-medium px-1.5 py-0.5 rounded-full flex-shrink-0 ${priorityBadge[vm.vorgang.priority] || "bg-gray-100 text-gray-600"}`}
                        >
                          {vm.vorgang.priority}
                        </span>
                      </div>
                      <p className="text-xs font-medium text-gray-800 line-clamp-2">
                        {vm.vorgang.title}
                      </p>
                      {vm.vorgang.assignedTo && (
                        <p className="text-xs text-gray-400 mt-1 truncate">
                          {vm.vorgang.assignedTo}
                        </p>
                      )}
                    </Link>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
