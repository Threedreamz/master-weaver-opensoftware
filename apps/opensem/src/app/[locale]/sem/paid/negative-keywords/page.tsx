import { PageHeader, EmptyState } from "@opensoftware/ui";
import { Ban } from "lucide-react";
import { setRequestLocale } from "next-intl/server";

export default async function NegativeKeywordsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <>
      <PageHeader
        title="Negative Keywords"
        description="Auto-suggestions for negative keywords to reduce wasted ad spend"
      />
      <EmptyState
        icon={<Ban className="w-12 h-12" />}
        title="No negative keyword suggestions"
        description="Connect Google Ads in Settings to receive auto-generated negative keyword recommendations."
      />
    </>
  );
}
