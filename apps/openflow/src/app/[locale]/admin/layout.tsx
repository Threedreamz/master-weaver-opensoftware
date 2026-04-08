export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { auth } from "@/lib/auth";
import { Sidebar } from "@/components/admin/Sidebar";

interface AdminLayoutProps {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}

export default async function AdminLayout({ children, params }: AdminLayoutProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const isDev = process.env.NODE_ENV === "development";
  const devUser = { name: "Dev Admin", email: "admin@openflow.dev" };

  let user: { name?: string | null; email?: string | null } | undefined;

  if (isDev) {
    // Skip auth() entirely in dev to avoid stale JWT cookie noise
    user = devUser;
  } else {
    const session = await auth();
    user = session?.user;
  }

  if (!user) {
    redirect(`/${locale}/login`);
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar locale={locale} />
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="h-14 border-b bg-white flex items-center justify-between px-6 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-indigo-600 flex items-center justify-center">
              <span className="text-white text-xs font-bold">OF</span>
            </div>
            <span className="font-semibold text-gray-900">OpenFlow</span>
          </div>
          <div className="flex items-center gap-3 text-sm text-gray-600">
            <span>{user.name || user.email}</span>
            <form
              action={async () => {
                "use server";
                const { signOut } = await import("@/lib/auth");
                await signOut({ redirectTo: `/${locale}/login` });
              }}
            >
              <button
                type="submit"
                className="text-xs text-gray-500 hover:text-gray-800 border border-gray-200 rounded px-2 py-1 transition-colors"
              >
                Logout
              </button>
            </form>
          </div>
        </header>
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
    </div>
  );
}
