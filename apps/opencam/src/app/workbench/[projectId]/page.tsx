import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import Workbench from "@/components/workbench/Workbench";

export const dynamic = "force-dynamic";

export default async function WorkbenchPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/workbench");
  }

  const { projectId } = await params;

  return <Workbench projectId={projectId} />;
}
