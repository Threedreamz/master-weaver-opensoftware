import { setRequestLocale } from "next-intl/server";
import { Sidebar } from "@/components/Sidebar";

interface AdminLayoutProps {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}

export default async function AdminLayout({ children, params }: AdminLayoutProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar locale={locale} />
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="h-14 border-b bg-white flex items-center justify-between px-6 pl-14 md:pl-6 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-blue-500 flex items-center justify-center">
              <span className="text-white text-xs font-bold">OS</span>
            </div>
            <span className="font-semibold text-gray-900 hidden sm:inline">OpenSlicer</span>
          </div>
        </header>
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
    </div>
  );
}
