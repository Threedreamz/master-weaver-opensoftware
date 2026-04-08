import { PageHeader, EmptyState } from "@opensoftware/ui";
import { MousePointerClick } from "lucide-react";
import { setRequestLocale } from "next-intl/server";

export default async function EventsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <>
      <PageHeader
        title="Events"
        description="Track and analyze user events and interactions"
      />
      <EmptyState
        icon={<MousePointerClick className="w-12 h-12" />}
        title="No events recorded"
        description="Set up event tracking to monitor user interactions on your website."
      />
    </>
  );
}
