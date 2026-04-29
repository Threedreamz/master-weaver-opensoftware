import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { auth } from "@/lib/auth";
import { FeedbackFAB } from "@opensoftware/ui";
import { submitFeedback } from "@/actions/feedback";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }
  if (session.user.role !== "admin") {
    redirect("/");
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      <header className="border-b border-neutral-800 bg-neutral-950/90">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <h1 className="text-lg font-semibold">OpenCAD Admin</h1>
          <nav className="flex gap-4 text-sm text-neutral-400">
            <a className="hover:text-neutral-100" href="/admin">
              Dashboard
            </a>
            <a className="hover:text-neutral-100" href="/api/health" target="_blank" rel="noreferrer">
              Health
            </a>
            <a
              className="hover:text-neutral-100"
              href="/api/appstore/manifest"
              target="_blank"
              rel="noreferrer"
            >
              Manifest
            </a>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
      <FeedbackFAB onSubmit={submitFeedback} />
    </div>
  );
}
