import { PageHeader, EmptyState } from "@opensoftware/ui";
import { Globe } from "lucide-react";
import { setRequestLocale } from "next-intl/server";

export default async function SemrushPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <>
      <PageHeader
        title="Semrush"
        description="Semrush integration for competitive analysis and keyword research"
      />
      <EmptyState
        icon={<Globe className="w-12 h-12" />}
        title="No Semrush data"
        description="Connect your Semrush account to access competitive analysis and keyword research."
      />
    </>
  );
}
