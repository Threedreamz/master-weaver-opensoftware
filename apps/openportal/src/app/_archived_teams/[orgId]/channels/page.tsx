import { ChannelsPanel } from "@opensoftware/openportal-ui";
import { getServerAdapter } from "@/lib/adapter";

export default async function ChannelsPage({
  params,
}: {
  params: Promise<{ orgId: string }>;
}) {
  const { orgId } = await params;
  const adapter = getServerAdapter(
    process.env.OPENPORTAL_WORKSPACE_ID ?? "default",
  );
  return (
    <main className="min-h-screen">
      <ChannelsPanel adapter={adapter} orgId={orgId} />
    </main>
  );
}
