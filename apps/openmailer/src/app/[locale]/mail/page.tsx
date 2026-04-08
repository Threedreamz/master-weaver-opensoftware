import { PageHeader, EmptyState } from "@opensoftware/ui";
import { Inbox } from "lucide-react";
import { setRequestLocale } from "next-intl/server";

export default async function MailInboxPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <>
      <PageHeader
        title="Inbox"
        description="Your email inbox"
        actions={
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
            Compose
          </button>
        }
      />
      <EmptyState
        icon={<Inbox className="w-12 h-12" />}
        title="No emails yet"
        description="Configure an email account in Settings to start receiving emails."
      />
    </>
  );
}
