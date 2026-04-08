import { PageHeader, EmptyState } from "@opensoftware/ui";
import { Settings } from "lucide-react";
import { setRequestLocale } from "next-intl/server";

export default async function MailSettingsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <>
      <PageHeader
        title="Email Settings"
        description="Configure your email accounts and IMAP/SMTP settings"
        actions={
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
            Add Account
          </button>
        }
      />
      <EmptyState
        icon={<Settings className="w-12 h-12" />}
        title="No email accounts configured"
        description="Add an IMAP email account to start sending and receiving emails."
      />
    </>
  );
}
