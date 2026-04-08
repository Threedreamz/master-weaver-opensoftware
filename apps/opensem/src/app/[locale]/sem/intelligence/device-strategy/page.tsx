import { PageHeader, EmptyState } from "@opensoftware/ui";
import { Smartphone } from "lucide-react";
import { setRequestLocale } from "next-intl/server";

export default async function DeviceStrategyPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <>
      <PageHeader
        title="Device Strategy"
        description="Mobile vs Desktop performance comparison and bid adjustments"
      />
      <EmptyState
        icon={<Smartphone className="w-12 h-12" />}
        title="No device data"
        description="Connect Google Ads in Settings to compare performance across devices and optimize bid modifiers."
      />
    </>
  );
}
