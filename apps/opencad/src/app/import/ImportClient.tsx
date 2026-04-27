"use client";

import dynamic from "next/dynamic";

const ImportDialogStandalone = dynamic(
  () => import("./ImportDialogStandalone").then((m) => m.ImportDialogStandalone),
  { ssr: false },
);

export function ImportClient() {
  return <ImportDialogStandalone />;
}
