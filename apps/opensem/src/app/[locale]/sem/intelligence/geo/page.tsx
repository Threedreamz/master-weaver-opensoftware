import { PageHeader, EmptyState } from "@opensoftware/ui";
import { MapPin } from "lucide-react";
import { setRequestLocale } from "next-intl/server";

export default async function GeoIntelligencePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <>
      <PageHeader
        title="Geo Intelligence"
        description="Regional bid modifiers and geographic performance analysis"
      />
      <EmptyState
        icon={<MapPin className="w-12 h-12" />}
        title="No geo data"
        description="Connect Google Ads in Settings to analyze performance by region and optimize geographic bid modifiers."
      />
    </>
  );
}
