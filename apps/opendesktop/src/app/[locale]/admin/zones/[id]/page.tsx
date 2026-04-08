import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { db } from "@/db";
import { deskBuildings, deskZones } from "@/db/schema";
import { eq } from "drizzle-orm";
import { ArrowLeft, Building2, Layers, Monitor, Wrench } from "lucide-react";

interface ZoneDetailPageProps {
  params: Promise<{ locale: string; id: string }>;
}

const workstationStatusBadge: Record<string, string> = {
  active: "bg-green-100 text-green-700",
  inactive: "bg-gray-100 text-gray-600",
  maintenance: "bg-orange-100 text-orange-700",
  reserved: "bg-blue-100 text-blue-700",
};

const workstationTypeBadge: Record<string, string> = {
  scanning: "bg-violet-100 text-violet-700",
  cad: "bg-indigo-100 text-indigo-700",
  printing: "bg-amber-100 text-amber-700",
  quality_check: "bg-teal-100 text-teal-700",
  packaging: "bg-cyan-100 text-cyan-700",
  assembly: "bg-emerald-100 text-emerald-700",
  office: "bg-gray-100 text-gray-600",
  general: "bg-slate-100 text-slate-600",
};

export default async function ZoneDetailPage({ params }: ZoneDetailPageProps) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("zones");
  const tc = await getTranslations("common");

  // Try as building first
  const building = await db.query.deskBuildings.findFirst({
    where: eq(deskBuildings.id, id),
    with: {
      zones: {
        with: {
          workstations: true,
        },
      },
    },
  });

  if (building) {
    const totalWorkstations = building.zones.reduce(
      (sum, zone) => sum + zone.workstations.length,
      0
    );

    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Link
            href={`/${locale}/admin/zones`}
            className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            <ArrowLeft size={16} />
            {tc("back")}
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">{building.name}</h1>
        </div>

        {/* Building info card */}
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center shrink-0">
              <Building2 size={22} className="text-white" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-gray-900">{building.name}</h2>
              {building.address && (
                <p className="text-sm text-gray-500 mt-0.5">{building.address}</p>
              )}
              {building.description && (
                <p className="text-sm text-gray-600 mt-2">{building.description}</p>
              )}
              <div className="flex items-center gap-4 mt-3 text-sm text-gray-500">
                <span>
                  <span className="font-medium text-gray-700">{building.zones.length}</span>{" "}
                  {t("zones")}
                </span>
                <span>
                  <span className="font-medium text-gray-700">{totalWorkstations}</span>{" "}
                  {t("workstations")}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Zones */}
        {building.zones.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
            <Layers size={40} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500">{t("noZones")}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {building.zones.map((zone) => (
              <div key={zone.id} className="rounded-xl border border-gray-200 bg-white overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4 bg-gray-50 border-b border-gray-100">
                  <div className="flex items-center gap-2">
                    <Layers size={16} className="text-indigo-500" />
                    <Link
                      href={`/${locale}/admin/zones/${zone.id}`}
                      className="font-semibold text-gray-900 hover:text-indigo-700 transition-colors"
                    >
                      {zone.name}
                    </Link>
                    <span
                      className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full uppercase ml-2 ${workstationTypeBadge[zone.type] || "bg-gray-100 text-gray-600"}`}
                    >
                      {zone.type}
                    </span>
                    {zone.floor !== null && zone.floor !== undefined && (
                      <span className="text-xs text-gray-400">{t("floor")} {zone.floor}</span>
                    )}
                  </div>
                  <span className="text-sm text-gray-500">
                    <span className="font-medium text-gray-700">{zone.workstations.length}</span>{" "}
                    {t("workstations")}
                  </span>
                </div>

                {zone.workstations.length > 0 && (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 bg-white">
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Code</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Name</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">{tc("type")}</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">{tc("status")}</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wide" />
                      </tr>
                    </thead>
                    <tbody>
                      {zone.workstations.map((ws) => (
                        <tr
                          key={ws.id}
                          className="border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors"
                        >
                          <td className="px-4 py-3 font-mono text-xs text-gray-500">{ws.code}</td>
                          <td className="px-4 py-3">
                            <div className="font-medium text-gray-900">{ws.name}</div>
                            {ws.description && (
                              <div className="text-xs text-gray-400 truncate max-w-xs">{ws.description}</div>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full uppercase ${workstationTypeBadge[ws.type] || "bg-gray-100 text-gray-600"}`}
                            >
                              {ws.type}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${workstationStatusBadge[ws.status] || "bg-gray-100 text-gray-600"}`}
                            >
                              {ws.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <Link
                              href={`/${locale}/admin/workstations/${ws.id}`}
                              className="text-xs text-indigo-500 hover:text-indigo-700 transition-colors"
                            >
                              Details
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Try as zone
  const zone = await db.query.deskZones.findFirst({
    where: eq(deskZones.id, id),
    with: {
      workstations: true,
      building: true,
    },
  });

  if (!zone) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href={`/${locale}/admin/zones/${zone.building.id}`}
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          <ArrowLeft size={16} />
          {zone.building.name}
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">{zone.name}</h1>
      </div>

      {/* Zone info card */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center shrink-0">
            <Layers size={22} className="text-indigo-600" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-semibold text-gray-900">{zone.name}</h2>
              <span
                className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full uppercase ${workstationTypeBadge[zone.type] || "bg-gray-100 text-gray-600"}`}
              >
                {zone.type}
              </span>
            </div>
            <div className="flex items-center gap-1 text-sm text-gray-500 mt-1">
              <Building2 size={13} />
              <Link
                href={`/${locale}/admin/zones/${zone.building.id}`}
                className="hover:text-indigo-600 transition-colors"
              >
                {zone.building.name}
              </Link>
              {zone.floor !== null && zone.floor !== undefined && (
                <span className="ml-2">
                  &middot; {t("floor")} {zone.floor}
                </span>
              )}
              {zone.capacity !== null && zone.capacity !== undefined && (
                <span className="ml-2">
                  &middot; {t("capacity")}: {zone.capacity}
                </span>
              )}
            </div>
            {zone.description && (
              <p className="text-sm text-gray-600 mt-2">{zone.description}</p>
            )}
          </div>
        </div>
      </div>

      {/* Workstations */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-3">
          {t("workstations")} ({zone.workstations.length})
        </h2>

        {zone.workstations.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
            <Monitor size={40} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500">{t("noWorkstations")}</p>
          </div>
        ) : (
          <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Code</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Name</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">{tc("type")}</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">{tc("status")}</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-600" />
                </tr>
              </thead>
              <tbody>
                {zone.workstations.map((ws) => (
                  <tr
                    key={ws.id}
                    className="border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-4 py-3 font-mono text-xs text-gray-500">{ws.code}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{ws.name}</div>
                      {ws.description && (
                        <div className="text-xs text-gray-400 truncate max-w-xs">{ws.description}</div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full uppercase ${workstationTypeBadge[ws.type] || "bg-gray-100 text-gray-600"}`}
                      >
                        {ws.type}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${workstationStatusBadge[ws.status] || "bg-gray-100 text-gray-600"}`}
                      >
                        {ws.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/${locale}/admin/workstations/${ws.id}`}
                        className="inline-flex items-center gap-1 text-xs text-indigo-500 hover:text-indigo-700 transition-colors"
                      >
                        <Wrench size={12} />
                        Details
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
