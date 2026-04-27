"use client";

import dynamic from "next/dynamic";

const Workbench = dynamic(
  () => import("@/components/workbench/Workbench").then((m) => m.Workbench),
  { ssr: false },
);

export function WorkbenchClient({ projectId }: { projectId: string }) {
  return <Workbench projectId={projectId} />;
}
