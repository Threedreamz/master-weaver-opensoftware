import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { db } from "@/db";
import { deskBuildings } from "@/db/schema";
import { Building2, Plus, MapPin, Layers, Trash2, Monitor } from "lucide-react";
import { deleteBuilding, deleteZone } from "./actions";

interface ZonesPageProps {
  params: Promise<{ locale: string }>;
}

const zoneBadge: Record<string, string> = {
  room: "bg-blue-100 text-blue-700",
  floor: "bg-indigo-100 text-indigo-700",
  area: "bg-purple-100 text-purple-700",
  hall: "bg-emerald-100 text-emerald-700",
};

export default async function ZonesPage({ params }: ZonesPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("zones");
  const tc = await getTranslations("common");

  const buildings = await db.query.deskBuildings.findMany({
    with: {
      zones: {
        with: {
          workstations: true,
        },
      },
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">{t("title")}</h1>
        <div className="flex items-center gap-2">
          <Link
            href={`/${locale}/admin/zones/new`}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
          >
            <Plus size={16} />
            {t("addBuilding")}
          </Link>
        </div>
      </div>

      {buildings.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
          <Building2 size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500 font-medium">{t("noBuildings")}</p>
          <p className="text-gray-400 text-sm mt-1">{t("noBuildingsHint")}</p>
          <Link
            href={`/${locale}/admin/zones/new`}
            className="inline-flex items-center gap-2 mt-4 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
          >
            <Plus size={16} />
            {t("addBuilding")}
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {buildings.map((building) => {
            const totalWorkstations = building.zones.reduce(
              (sum, zone) => sum + zone.workstations.length,
              0
            );

            return (
              <div
                key={building.id}
                className="rounded-xl border border-gray-200 bg-white overflow-hidden"
              >
                {/* Building header */}
                <div className="flex items-center justify-between px-6 py-4 bg-indigo-50 border-b border-indigo-100">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-indigo-600 rounded-lg flex items-center justify-center">
                      <Building2 size={18} className="text-white" />
                    </div>
                    <div>
                      <Link
                        href={`/${locale}/admin/zones/${building.id}`}
                        className="font-semibold text-gray-900 hover:text-indigo-700 transition-colors"
                      >
                        {building.name}
                      </Link>
                      {building.address && (
                        <div className="flex items-center gap-1 text-xs text-gray-500 mt-0.5">
                          <MapPin size={11} />
                          {building.address}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right text-sm text-gray-500">
                      <span className="font-medium text-gray-700">{building.zones.length}</span>{" "}
                      {t("zones")} &middot;{" "}
                      <span className="font-medium text-gray-700">{totalWorkstations}</span>{" "}
                      {t("workstations")}
                    </div>
                    <form action={deleteBuilding}>
                      <input type="hidden" name="id" value={building.id} />
                      <button
                        type="submit"
                        className="inline-flex items-center gap-1 text-xs text-red-500 hover:text-red-700 transition-colors"
                        title={tc("delete")}
                      >
                        <Trash2 size={14} />
                      </button>
                    </form>
                  </div>
                </div>

                {/* Zones list */}
                {building.zones.length === 0 ? (
                  <div className="px-6 py-8 text-center text-gray-400 text-sm">
                    {t("noZones")}
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {building.zones.map((zone) => (
                      <div
                        key={zone.id}
                        className="flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-7 h-7 bg-gray-100 rounded-md flex items-center justify-center">
                            <Layers size={14} className="text-gray-500" />
                          </div>
                          <div>
                            <Link
                              href={`/${locale}/admin/zones/${zone.id}`}
                              className="font-medium text-gray-900 hover:text-indigo-700 transition-colors text-sm"
                            >
                              {zone.name}
                            </Link>
                            {zone.floor !== null && zone.floor !== undefined && (
                              <div className="text-xs text-gray-400 mt-0.5">
                                {t("floor")} {zone.floor}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span
                            className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full uppercase ${zoneBadge[zone.type] || "bg-gray-100 text-gray-600"}`}
                          >
                            {zone.type}
                          </span>
                          <div className="flex items-center gap-1 text-xs text-gray-500">
                            <Monitor size={12} />
                            {zone.workstations.length}
                          </div>
                          <form action={deleteZone}>
                            <input type="hidden" name="id" value={zone.id} />
                            <button
                              type="submit"
                              className="inline-flex items-center gap-1 text-xs text-red-400 hover:text-red-600 transition-colors"
                              title={tc("delete")}
                            >
                              <Trash2 size={13} />
                            </button>
                          </form>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
