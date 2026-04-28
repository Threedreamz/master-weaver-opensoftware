import { setRequestLocale, getTranslations } from "next-intl/server";
import { Microscope, Hammer, ArrowRight, Sparkles } from "lucide-react";

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();

  return (
    <main className="min-h-screen relative overflow-hidden bg-white text-[var(--ies-ink)]">
      {/* WIP banner */}
      <div className="bg-amber-50 border-b border-amber-200 text-amber-900 text-xs">
        <div className="mx-auto max-w-6xl px-6 py-2 flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5" />
          <span className="font-medium">{t("wip.badge")}</span>
          <span>·</span>
          <span>{t("wip.headline")}</span>
          <span className="ml-auto text-amber-700/80">{t("wip.lead")}</span>
        </div>
      </div>

      {/* Top bar */}
      <header className="border-b border-gray-100">
        <div className="mx-auto max-w-6xl px-6 py-5 flex items-center">
          <div className="flex items-center gap-2 font-semibold tracking-tight">
            <span
              aria-hidden="true"
              className="inline-block w-3 h-3 rounded-full"
              style={{ background: "var(--ies-orange)" }}
            />
            IES
          </div>
          <nav className="ml-auto flex items-center gap-6 text-sm text-gray-600">
            <span className="opacity-60 cursor-not-allowed">Maschinenpark</span>
            <span className="opacity-60 cursor-not-allowed">Anwendungsfälle</span>
            <span className="opacity-60 cursor-not-allowed">Kontakt</span>
            <button
              type="button"
              className="opacity-50 cursor-not-allowed inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-white"
              style={{ background: "var(--ies-orange)" }}
              disabled
            >
              {t("hero.ctaPrimary")} <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="relative">
        <div className="mx-auto max-w-6xl px-6 py-24 sm:py-32 grid lg:grid-cols-12 gap-12">
          <div className="lg:col-span-7">
            <p className="text-xs font-medium tracking-widest uppercase text-gray-500 mb-4">
              {t("hero.eyebrow")}
            </p>
            <h1 className="text-5xl sm:text-6xl font-bold leading-[1.05] tracking-tight whitespace-pre-line">
              {t("hero.headline")}
            </h1>
            <p className="mt-6 text-lg text-gray-600 max-w-2xl leading-relaxed">
              {t("hero.lead")}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <button
                type="button"
                disabled
                className="inline-flex items-center gap-2 px-5 py-3 rounded-lg text-white font-medium opacity-50 cursor-not-allowed"
                style={{ background: "var(--ies-orange)" }}
              >
                {t("hero.ctaPrimary")} <ArrowRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                disabled
                className="inline-flex items-center gap-2 px-5 py-3 rounded-lg border border-gray-200 text-gray-700 font-medium opacity-50 cursor-not-allowed"
              >
                {t("hero.ctaSecondary")}
              </button>
            </div>
          </div>

          <div className="lg:col-span-5 flex items-center justify-center">
            <div className="grid grid-cols-2 gap-3 w-full max-w-sm">
              {[
                { icon: Microscope, label: "Werth TomoScope" },
                { icon: Microscope, label: "Keyence VL-800" },
                { icon: Hammer, label: "Concept Laser SLM" },
                { icon: Hammer, label: "Formlabs SLS / SLA" },
              ].map((m) => (
                <div
                  key={m.label}
                  className="aspect-square rounded-2xl border border-gray-100 bg-gradient-to-br from-gray-50 to-white p-5 flex flex-col items-start justify-between hover:border-gray-200 transition-colors"
                >
                  <m.icon className="w-6 h-6" style={{ color: "var(--ies-orange)" }} />
                  <span className="text-xs font-medium text-gray-700 leading-tight">
                    {m.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Foundation footer */}
      <footer className="border-t border-gray-100 mt-12">
        <div className="mx-auto max-w-6xl px-6 py-6 flex items-center justify-between text-xs text-gray-500">
          <div>
            {t("wip.status")} <span className="font-mono">W0 Foundation</span> · ies-portal
          </div>
          <div>© IES GmbH</div>
        </div>
      </footer>
    </main>
  );
}
