import { setRequestLocale } from "next-intl/server";
import { db } from "@/db";
import { farmModels, farmSlicerProfiles } from "@/db/schema";
import { sql, desc } from "drizzle-orm";
import Link from "next/link";
import { Scissors, Box, SlidersHorizontal, Cpu, ArrowRight, ExternalLink } from "lucide-react";
import { formatBytes } from "@/lib/format-bytes";

export const dynamic = "force-dynamic";

interface SlicingPageProps {
  params: Promise<{ locale: string }>;
}

const FORMAT_COLORS: Record<string, string> = {
  stl: "bg-blue-100 text-blue-700",
  "3mf": "bg-green-100 text-green-700",
  obj: "bg-purple-100 text-purple-700",
  step: "bg-orange-100 text-orange-700",
};

export default async function SlicingPage({ params }: SlicingPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const [modelCountResult, profileCountResult, recentModels] = await Promise.all([
    db.select({ count: sql<number>`count(*)` }).from(farmModels),
    db.select({ count: sql<number>`count(*)` }).from(farmSlicerProfiles),
    db.select().from(farmModels).orderBy(desc(farmModels.createdAt)).limit(5),
  ]);

  const modelCount = modelCountResult[0]?.count ?? 0;
  const profileCount = profileCountResult[0]?.count ?? 0;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Scissors size={24} className="text-amber-500" />
          Slicen
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Modelle vorbereiten, slicen und an Drucker senden
        </p>
      </div>

      {/* Workflow Steps */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-stretch">
        {/* Step 1: Model */}
        <div className="relative rounded-xl border border-gray-200 bg-white p-5">
          <div className="flex items-center gap-2 mb-3">
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-100 text-amber-700 text-xs font-bold">
              1
            </span>
            <h2 className="text-sm font-semibold text-gray-900">Modell w&auml;hlen</h2>
          </div>
          <Box size={32} className="text-gray-300 mb-3" />
          <p className="text-sm text-gray-600 mb-4">
            {modelCount} Modelle verf&uuml;gbar
          </p>
          <Link
            href={`/${locale}/admin/models`}
            className="inline-flex items-center gap-1 text-sm font-medium text-amber-600 hover:text-amber-700 transition-colors"
          >
            Modelle ansehen
            <ArrowRight size={14} />
          </Link>
        </div>

        {/* Arrow between Step 1 and 2 (hidden on mobile) */}
        <div className="hidden md:flex items-center justify-center -mx-6 col-span-1 row-start-1 col-start-1 pointer-events-none" style={{ position: "absolute", left: "calc(33.33% - 12px)", top: "50%", transform: "translateY(-50%)", zIndex: 10 }}>
        </div>

        {/* Step 2: Profile */}
        <div className="relative rounded-xl border border-gray-200 bg-white p-5">
          <div className="flex items-center gap-2 mb-3">
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-100 text-amber-700 text-xs font-bold">
              2
            </span>
            <h2 className="text-sm font-semibold text-gray-900">Profil w&auml;hlen</h2>
          </div>
          <SlidersHorizontal size={32} className="text-gray-300 mb-3" />
          <p className="text-sm text-gray-600 mb-4">
            {profileCount} Profile verf&uuml;gbar
          </p>
          <Link
            href={`/${locale}/admin/profiles`}
            className="inline-flex items-center gap-1 text-sm font-medium text-amber-600 hover:text-amber-700 transition-colors"
          >
            Profile ansehen
            <ArrowRight size={14} />
          </Link>
        </div>

        {/* Step 3: Slice */}
        <div className="relative rounded-xl border border-gray-200 bg-white p-5">
          <div className="flex items-center gap-2 mb-3">
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-100 text-amber-700 text-xs font-bold">
              3
            </span>
            <h2 className="text-sm font-semibold text-gray-900">Slicen</h2>
          </div>
          <Cpu size={32} className="text-gray-300 mb-3" />
          <p className="text-sm text-gray-600 mb-4">
            G-Code oder Schichtdaten generieren
          </p>
          <a
            href="#"
            className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white hover:bg-amber-600 transition-colors"
          >
            OpenSlicer starten
            <ExternalLink size={14} />
          </a>
        </div>
      </div>

      {/* Flow arrows between steps (decorative, visible on md+) */}
      <div className="hidden md:flex justify-center -mt-6 mb-2 gap-0">
        <div className="flex items-center" style={{ width: "33.33%" }}>
          <div className="flex-1" />
          <ArrowRight size={20} className="text-amber-300" />
        </div>
        <div className="flex items-center" style={{ width: "33.33%" }}>
          <div className="flex-1" />
          <ArrowRight size={20} className="text-amber-300" />
        </div>
      </div>

      {/* Technology Cards */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Technologien</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* FDM */}
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <span className="inline-flex items-center rounded-full bg-amber-100 text-amber-700 px-2.5 py-0.5 text-xs font-medium mb-3">
              FDM
            </span>
            <p className="text-sm text-gray-600">
              G-Code generieren f&uuml;r Filament-Drucker (PrusaSlicer, OrcaSlicer, Bambu Studio)
            </p>
          </div>

          {/* SLA */}
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <span className="inline-flex items-center rounded-full bg-purple-100 text-purple-700 px-2.5 py-0.5 text-xs font-medium mb-3">
              SLA
            </span>
            <p className="text-sm text-gray-600">
              Schicht-Bilder generieren f&uuml;r Resin-Drucker (ChiTuBox, Lychee)
            </p>
          </div>

          {/* SLS */}
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <span className="inline-flex items-center rounded-full bg-blue-100 text-blue-700 px-2.5 py-0.5 text-xs font-medium mb-3">
              SLS
            </span>
            <p className="text-sm text-gray-600 mb-3">
              Pulverbett-Layout optimieren (SLS4All)
            </p>
            <Link
              href={`/${locale}/admin/packing`}
              className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
            >
              Zum Packing
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </div>

      {/* Recent Models */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Letzte Modelle</h2>
        {recentModels.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-white p-8 text-center">
            <Box size={40} className="mx-auto text-gray-300 mb-3" />
            <p className="text-sm text-gray-500">Noch keine Modelle hochgeladen</p>
          </div>
        ) : (
          <div className="rounded-xl border border-gray-200 bg-white divide-y divide-gray-100">
            {recentModels.map((model) => (
              <Link
                key={model.id}
                href={`/${locale}/admin/models/${model.id}`}
                className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Box size={18} className="text-gray-400 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{model.name}</p>
                    <p className="text-xs text-gray-400 truncate">{model.filename}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0 ml-4">
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium uppercase ${FORMAT_COLORS[model.fileFormat] || "bg-gray-100 text-gray-700"}`}
                  >
                    {model.fileFormat}
                  </span>
                  <span className="text-xs text-gray-400">
                    {formatBytes(model.fileSizeBytes)}
                  </span>
                  <ArrowRight size={14} className="text-gray-300" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
