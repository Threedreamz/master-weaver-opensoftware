import { PageHeader, EmptyState } from "@opensoftware/ui";
import { Gauge } from "lucide-react";
import { setRequestLocale } from "next-intl/server";

export default async function PageSpeedPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <>
      <PageHeader
        title="PageSpeed"
        description="Monitor page load performance and Core Web Vitals"
      />
      <EmptyState
        icon={<Gauge className="w-12 h-12" />}
        title="No PageSpeed data"
        description="Add a URL to start measuring page load performance and Core Web Vitals."
      />
    </>
  );
}
