import { redirect } from "next/navigation";
import dynamicImport from "next/dynamic";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

const Workbench = dynamicImport(
  () => import("@/components/workbench/Workbench").then((m) => m.Workbench),
  { ssr: false },
);

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

  return <Workbench projectId={projectId} />;
}
