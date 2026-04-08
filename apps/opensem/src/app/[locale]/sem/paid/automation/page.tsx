import { PageHeader, EmptyState } from "@opensoftware/ui";
import { Zap } from "lucide-react";
import { setRequestLocale } from "next-intl/server";

export default async function AutomationPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <>
      <PageHeader
        title="Automation"
        description="IF/THEN rules for automated bid adjustments and campaign management"
      />
      <EmptyState
        icon={<Zap className="w-12 h-12" />}
        title="No automation rules"
        description="Connect Google Ads in Settings to create automated IF/THEN rules for campaign management."
      />
    </>
  );
}
