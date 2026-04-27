import { AuditPanel } from "@opensoftware/openportal-ui";
import { getServerAdapter } from "@/lib/adapter";

export default async function AuditPage({
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
      <AuditPanel adapter={adapter} orgId={orgId} />
    </main>
  );
}
