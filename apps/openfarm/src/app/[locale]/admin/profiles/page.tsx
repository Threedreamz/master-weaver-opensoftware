import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getProfiles } from "@/db/queries/profiles";
import { Settings2, Plus, Trash2 } from "lucide-react";
import { deleteProfile } from "./actions";

interface ProfilesPageProps {
  params: Promise<{ locale: string }>;
}

const technologyBadge: Record<string, string> = {
  fdm: "bg-amber-100 text-amber-700",
  sla: "bg-purple-100 text-purple-700",
  sls: "bg-blue-100 text-blue-700",
};

const engineLabels: Record<string, string> = {
  prusaslicer: "PrusaSlicer",
  orcaslicer: "OrcaSlicer",
  bambu_studio: "Bambu Studio",
  preform: "PreForm",
  chitubox: "ChiTuBox",
  lychee: "Lychee Slicer",
  sls4all: "SLS4All",
  custom: "Custom",
};

export default async function ProfilesPage({ params }: ProfilesPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("profiles");
  const tc = await getTranslations("common");
  const allProfiles = await getProfiles();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">{t("title")}</h1>
        <Link
          href={`/${locale}/admin/profiles/new`}
          className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white hover:bg-amber-600 transition-colors"
        >
          <Plus size={16} />
          {t("addProfile")}
        </Link>
      </div>

      {allProfiles.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
          <Settings2 size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500">{t("noProfiles")}</p>
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="px-4 py-3 text-left font-medium text-gray-600">Name</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">{t("technology")}</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">{t("slicerEngine")}</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">{t("layerHeight")}</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">{t("description")}</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600" />
              </tr>
            </thead>
            <tbody>
              {allProfiles.map((profile) => (
                <tr
                  key={profile.id}
                  className="border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors"
                >
                  <td className="px-4 py-3">
                    <span className="font-medium text-gray-900">{profile.name}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full uppercase ${technologyBadge[profile.technology] || "bg-gray-100 text-gray-600"}`}
                    >
                      {profile.technology}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {engineLabels[profile.slicerEngine] || profile.slicerEngine}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {profile.layerHeight != null ? `${profile.layerHeight} mm` : "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs max-w-xs truncate">
                    {profile.description || "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <form action={deleteProfile}>
                      <input type="hidden" name="id" value={profile.id} />
                      <button
                        type="submit"
                        className="inline-flex items-center gap-1 text-xs text-red-500 hover:text-red-700 transition-colors"
                        title={tc("delete")}
                      >
                        <Trash2 size={14} />
                        {tc("delete")}
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
