import { PageHeader, EmptyState } from "@opensoftware/ui";
import { AlertTriangle } from "lucide-react";
import { setRequestLocale } from "next-intl/server";

export default async function CannibalizationPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <>
      <PageHeader
        title="Cannibalization Monitor"
        description="Detect SEO/SEA keyword overlap where organic and paid compete against each other"
      />
      <EmptyState
        icon={<AlertTriangle className="w-12 h-12" />}
        title="No cannibalization data"
        description="Connect both Google Ads and SEMrush in Settings to detect keyword cannibalization between organic and paid channels."
      />
    </>
  );
}
