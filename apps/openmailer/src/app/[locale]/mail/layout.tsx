import { Mail, Inbox, Send, FileEdit, Trash2, Settings, FileStack, ListOrdered, AlertTriangle } from "lucide-react";
import { AppShell, Sidebar, type SidebarItem } from "@opensoftware/ui";
import { setRequestLocale } from "next-intl/server";
import { SessionGuard } from "@/components/auth/SessionGuard";

export default async function MailLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const navItems: SidebarItem[] = [
    { key: "inbox", href: `/${locale}/mail`, label: "Inbox", icon: <Inbox className="w-5 h-5" />, exact: true },
    { key: "sent", href: `/${locale}/mail?folder=sent`, label: "Sent", icon: <Send className="w-5 h-5" /> },
    { key: "drafts", href: `/${locale}/mail?folder=drafts`, label: "Drafts", icon: <FileEdit className="w-5 h-5" /> },
    { key: "trash", href: `/${locale}/mail?folder=trash`, label: "Trash", icon: <Trash2 className="w-5 h-5" /> },
    { key: "templates", href: `/${locale}/mail/templates`, label: "Templates", icon: <FileStack className="w-5 h-5" /> },
    { key: "queue", href: `/${locale}/mail/queue`, label: "Queue", icon: <ListOrdered className="w-5 h-5" /> },
    { key: "bounces", href: `/${locale}/mail/bounces`, label: "Bounces", icon: <AlertTriangle className="w-5 h-5" /> },
    { key: "settings", href: `/${locale}/mail/settings`, label: "Settings", icon: <Settings className="w-5 h-5" /> },
  ];

  const sidebarHeader = (
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
        <Mail className="w-6 h-6 text-white" />
      </div>
      <div>
        <h2 className="font-semibold text-gray-900 dark:text-white">OpenMailer</h2>
        <p className="text-xs text-gray-500">Email Client</p>
      </div>
    </div>
  );

  return (
    <SessionGuard requiredRole="viewer">
      <AppShell sidebar={<Sidebar items={navItems} header={sidebarHeader} />}>
        {children}
      </AppShell>
    </SessionGuard>
  );
}
