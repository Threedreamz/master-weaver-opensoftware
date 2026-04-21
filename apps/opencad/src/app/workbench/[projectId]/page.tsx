import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { WorkbenchClient } from "./WorkbenchClient";

export const dynamic = "force-dynamic";

export default async function WorkbenchPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const { projectId } = await params;

  return <WorkbenchClient projectId={projectId} />;
}
