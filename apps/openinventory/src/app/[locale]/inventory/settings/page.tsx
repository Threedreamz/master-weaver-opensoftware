import { PageHeader, EmptyState } from "@opensoftware/ui";
import { Settings } from "lucide-react";
import { setRequestLocale } from "next-intl/server";

export default async function SettingsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <>
      <PageHeader
        title="Einstellungen"
        description="Lager-, Bestell- und Produktionseinstellungen konfigurieren"
      />
      <EmptyState
        icon={<Settings className="w-12 h-12" />}
        title="Noch nicht konfiguriert"
        description="Richten Sie Lagerorte, Standardeinheiten, Bestellrichtlinien und Produktionsparameter ein."
      />
    </>
  );
}
