"use client";

import { PageHeader, EmptyState } from "@opensoftware/ui";
import { Settings } from "lucide-react";

export default function SettingsPage() {
  return (
    <>
      <PageHeader
        title="Einstellungen"
        description="Lohnbuchhaltungs-Konfiguration"
      />
      <EmptyState
        icon={<Settings className="w-12 h-12" />}
        title="Einstellungen konfigurieren"
        description="Hier koennen Sie allgemeine Lohnbuchhaltungseinstellungen wie Standardwerte, Beitragssaetze und Unternehmensangaben verwalten."
      />
    </>
  );
}
