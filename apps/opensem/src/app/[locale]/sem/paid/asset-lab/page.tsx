import { PageHeader, EmptyState } from "@opensoftware/ui";
import { Palette } from "lucide-react";
import { setRequestLocale } from "next-intl/server";

export default async function AssetLabPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <>
      <PageHeader
        title="Asset Lab"
        description="Ad creative performance — headlines, descriptions, images, and extensions"
      />
      <EmptyState
        icon={<Palette className="w-12 h-12" />}
        title="No asset data"
        description="Connect Google Ads in Settings to analyze ad creative performance across campaigns."
      />
    </>
  );
}
