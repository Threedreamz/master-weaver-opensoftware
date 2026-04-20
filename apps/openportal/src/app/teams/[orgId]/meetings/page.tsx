import { MeetingsPanel } from "@opensoftware/openportal-ui";
import { getServerAdapter } from "@/lib/adapter";

export default async function MeetingsPage({
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
      <MeetingsPanel adapter={adapter} orgId={orgId} />
    </main>
  );
}
