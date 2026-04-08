export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { db } from "@/db";
import { flows } from "@/db/schema";
import { eq } from "drizzle-orm";
import { FlowDetailNav } from "./FlowDetailNav";

interface FlowDetailLayoutProps {
  children: React.ReactNode;
  params: Promise<{ locale: string; flowId: string }>;
}

export default async function FlowDetailLayout({
  children,
  params,
}: FlowDetailLayoutProps) {
  const { locale, flowId } = await params;

  // Fetch flow basic data
  const flow = await db.query.flows.findFirst({
    where: eq(flows.id, flowId),
    columns: { id: true, name: true, slug: true, status: true },
  });

  if (!flow) {
    notFound();
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Heyflow-style top navigation bar — 56px */}
      <FlowDetailNav
        locale={locale}
        flowId={flowId}
        flowName={flow.name}
        flowSlug={flow.slug}
        flowStatus={flow.status}
      />

      {/* Content fills remaining viewport height */}
      <div className="flex-1 overflow-hidden">{children}</div>
    </div>
  );
}
