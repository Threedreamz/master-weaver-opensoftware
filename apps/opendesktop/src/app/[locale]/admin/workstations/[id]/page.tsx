import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { db } from "@/db";
import { deskWorkstations } from "@/db/schema";
import { eq } from "drizzle-orm";
import {
  ArrowLeft,
  Monitor,
  Wrench,
  Package,
  Printer,
  AlertTriangle,
} from "lucide-react";

interface WorkstationDetailPageProps {
  params: Promise<{ locale: string; id: string }>;
}

const statusBadge: Record<string, string> = {
  active: "bg-green-100 text-green-700",
  inactive: "bg-gray-100 text-gray-600",
  maintenance: "bg-yellow-100 text-yellow-700",
  reserved: "bg-blue-100 text-blue-700",
};

const equipmentStatusBadge: Record<string, string> = {
  operational: "bg-green-100 text-green-700",
  broken: "bg-red-100 text-red-700",
  maintenance: "bg-yellow-100 text-yellow-700",
  retired: "bg-gray-100 text-gray-600",
};

const issuePriorityBadge: Record<string, string> = {
  low: "bg-gray-100 text-gray-600",
  medium: "bg-yellow-100 text-yellow-700",
  high: "bg-orange-100 text-orange-700",
  critical: "bg-red-100 text-red-700",
};

const issueStatusBadge: Record<string, string> = {
  open: "bg-blue-100 text-blue-700",
  in_progress: "bg-yellow-100 text-yellow-700",
  resolved: "bg-green-100 text-green-700",
  closed: "bg-gray-100 text-gray-600",
};

export default async function WorkstationDetailPage({ params }: WorkstationDetailPageProps) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("workstations");
  const te = await getTranslations("equipment");
  const ti = await getTranslations("issues");
  const tc = await getTranslations("common");

  const workstation = await db.query.deskWorkstations.findFirst({
    where: eq(deskWorkstations.id, id),
    with: {
      zone: {
        with: {
          building: true,
        },
      },
      equipment: {
        orderBy: (eq, { asc }) => [asc(eq.name)],
      },
      inventoryLinks: {
        orderBy: (il, { asc }) => [asc(il.bezeichnung)],
      },
      printerLinks: {
        orderBy: (pl, { asc }) => [asc(pl.printerName)],
      },
      issues: {
        orderBy: (iss, { desc }) => [desc(iss.createdAt)],
        limit: 10,
      },
    },
  });

  if (!workstation) {
    notFound();
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href={`/${locale}/admin/workstations`}
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          <ArrowLeft size={16} />
          {tc("back")}
        </Link>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-indigo-50 rounded-lg flex items-center justify-center">
              <Monitor size={24} className="text-indigo-600" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="font-mono text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded">
                  {workstation.code}
                </span>
                <span
                  className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${statusBadge[workstation.status] ?? "bg-gray-100 text-gray-600"}`}
                >
                  {t(workstation.status as Parameters<typeof t>[0])}
                </span>
              </div>
              <h1 className="text-2xl font-bold text-gray-900">{workstation.name}</h1>
              <div className="flex items-center gap-2 mt-1">
                <span className="inline-block text-xs font-medium px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
                  {t(workstation.type as Parameters<typeof t>[0])}
                </span>
                {workstation.zone && (
                  <span className="text-sm text-gray-500">
                    {workstation.zone.building?.name}
                    <span className="mx-1 text-gray-300">›</span>
                    {workstation.zone.name}
                  </span>
                )}
              </div>
              {workstation.description && (
                <p className="text-sm text-gray-600 mt-2">{workstation.description}</p>
              )}
              {workstation.tags && workstation.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {workstation.tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Equipment Section */}
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <div className="flex items-center gap-2 px-6 py-4 border-b border-gray-200 bg-gray-50">
          <Wrench size={18} className="text-gray-500" />
          <h2 className="font-semibold text-gray-900">
            {t("equipmentTab")}
            <span className="ml-2 text-sm font-normal text-gray-500">
              ({workstation.equipment.length})
            </span>
          </h2>
        </div>
        {workstation.equipment.length === 0 ? (
          <div className="px-6 py-8 text-center text-sm text-gray-400">
            {te("noEquipment")}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="px-4 py-3 text-left font-medium text-gray-600">{te("name")}</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">{te("category")}</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">{te("serialNumber")}</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">{te("status")}</th>
              </tr>
            </thead>
            <tbody>
              {workstation.equipment.map((item) => (
                <tr key={item.id} className="border-b border-gray-100 last:border-0">
                  <td className="px-4 py-3 font-medium text-gray-900">{item.name}</td>
                  <td className="px-4 py-3">
                    <span className="inline-block text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                      {te(item.category as Parameters<typeof te>[0])}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 font-mono text-xs">
                    {item.serialNumber || "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${equipmentStatusBadge[item.status] ?? "bg-gray-100 text-gray-600"}`}
                    >
                      {item.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Inventory Links Section */}
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <div className="flex items-center gap-2 px-6 py-4 border-b border-gray-200 bg-gray-50">
          <Package size={18} className="text-gray-500" />
          <h2 className="font-semibold text-gray-900">
            {t("inventoryTab")}
            <span className="ml-2 text-sm font-normal text-gray-500">
              ({workstation.inventoryLinks.length})
            </span>
          </h2>
        </div>
        {workstation.inventoryLinks.length === 0 ? (
          <div className="px-6 py-8 text-center text-sm text-gray-400">
            Keine Inventar-Verknuepfungen vorhanden
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="px-4 py-3 text-left font-medium text-gray-600">Artikelnummer</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Bezeichnung</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Menge</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Typ</th>
              </tr>
            </thead>
            <tbody>
              {workstation.inventoryLinks.map((link) => (
                <tr key={link.id} className="border-b border-gray-100 last:border-0">
                  <td className="px-4 py-3 font-mono text-xs text-gray-600">
                    {link.artikelnummer || "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-900">{link.bezeichnung || "—"}</td>
                  <td className="px-4 py-3 text-gray-600">
                    {link.quantity != null ? link.quantity : "—"}
                    {link.minQuantity != null && (
                      <span className="text-gray-400 text-xs ml-1">
                        (min. {link.minQuantity})
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-block text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                      {link.locationType}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Printer Links Section */}
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <div className="flex items-center gap-2 px-6 py-4 border-b border-gray-200 bg-gray-50">
          <Printer size={18} className="text-gray-500" />
          <h2 className="font-semibold text-gray-900">
            {t("printersTab")}
            <span className="ml-2 text-sm font-normal text-gray-500">
              ({workstation.printerLinks.length})
            </span>
          </h2>
        </div>
        {workstation.printerLinks.length === 0 ? (
          <div className="px-6 py-8 text-center text-sm text-gray-400">
            Keine Drucker verknuepft
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="px-4 py-3 text-left font-medium text-gray-600">Drucker-ID</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Name</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Primaer</th>
              </tr>
            </thead>
            <tbody>
              {workstation.printerLinks.map((link) => (
                <tr key={link.id} className="border-b border-gray-100 last:border-0">
                  <td className="px-4 py-3 font-mono text-xs text-gray-600">
                    {link.farmPrinterId}
                  </td>
                  <td className="px-4 py-3 text-gray-900">{link.printerName || "—"}</td>
                  <td className="px-4 py-3">
                    {link.isPrimary ? (
                      <span className="inline-block text-xs font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                        Ja
                      </span>
                    ) : (
                      <span className="text-gray-400 text-xs">Nein</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Issues Section */}
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <div className="flex items-center gap-2 px-6 py-4 border-b border-gray-200 bg-gray-50">
          <AlertTriangle size={18} className="text-gray-500" />
          <h2 className="font-semibold text-gray-900">
            {t("issuesTab")}
            <span className="ml-2 text-sm font-normal text-gray-500">
              ({workstation.issues.length})
            </span>
          </h2>
        </div>
        {workstation.issues.length === 0 ? (
          <div className="px-6 py-8 text-center text-sm text-gray-400">
            {ti("noIssues")}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="px-4 py-3 text-left font-medium text-gray-600">{ti("issueTitle")}</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">{ti("priority")}</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">{ti("status")}</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">{ti("category")}</th>
              </tr>
            </thead>
            <tbody>
              {workstation.issues.map((issue) => (
                <tr key={issue.id} className="border-b border-gray-100 last:border-0">
                  <td className="px-4 py-3 font-medium text-gray-900">{issue.title}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${issuePriorityBadge[issue.priority] ?? "bg-gray-100 text-gray-600"}`}
                    >
                      {ti(issue.priority as Parameters<typeof ti>[0])}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${issueStatusBadge[issue.status] ?? "bg-gray-100 text-gray-600"}`}
                    >
                      {ti(issue.status as Parameters<typeof ti>[0])}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-block text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                      {ti(issue.category as Parameters<typeof ti>[0])}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
