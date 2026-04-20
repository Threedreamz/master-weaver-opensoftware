import { TeamsPanel } from "@opensoftware/openportal-ui";
import { getServerAdapter } from "@/lib/adapter";

export default async function TeamsPage() {
  const adapter = getServerAdapter(
    process.env.OPENPORTAL_WORKSPACE_ID ?? "default",
  );
  return (
    <main className="min-h-screen">
      <TeamsPanel adapter={adapter} />
    </main>
  );
}
