import type { Metadata } from "next";
import { eq, and, desc } from "drizzle-orm";
import { db } from "@/db";
import { flows, flowVersions } from "@/db/schema";
import { EmbedClient } from "./EmbedClient";

interface EmbedPageProps {
  params: Promise<{ flowSlug: string }>;
}

async function getFlowBySlug(slug: string) {
  const flow = await db.query.flows.findFirst({
    where: and(eq(flows.slug, slug), eq(flows.status, "published")),
  });

  if (!flow) return null;

  const latestVersion = await db.query.flowVersions.findFirst({
    where: eq(flowVersions.flowId, flow.id),
    orderBy: [desc(flowVersions.version)],
  });

  const settings = flow.settings ? JSON.parse(flow.settings) : {};
  const snapshot = latestVersion?.snapshot ? JSON.parse(latestVersion.snapshot) : {};

  return {
    name: flow.name,
    description: flow.description,
    settings,
    snapshotSettings: snapshot.settings,
  };
}

export async function generateMetadata({ params }: EmbedPageProps): Promise<Metadata> {
  const { flowSlug } = await params;
  const flow = await getFlowBySlug(flowSlug);

  if (!flow) {
    return { title: "Form not found" };
  }

  // OG settings can come from flow-level settings or snapshot settings
  const og = flow.settings?.og || flow.snapshotSettings?.og;

  const title = og?.title || flow.name;
  const description = og?.description || flow.description || undefined;

  const metadata: Metadata = {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
    },
  };

  if (og?.imageUrl) {
    metadata.openGraph = {
      ...metadata.openGraph,
      images: [{ url: og.imageUrl }],
    };
  }

  return metadata;
}

export default async function EmbedPage({ params }: EmbedPageProps) {
  const { flowSlug } = await params;
  return <EmbedClient flowSlug={flowSlug} />;
}
