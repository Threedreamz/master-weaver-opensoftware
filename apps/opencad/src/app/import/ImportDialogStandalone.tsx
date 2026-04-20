"use client";

/**
 * Thin standalone wrapper around the modal-style ImportDialog so the /import
 * page can host it as an always-open panel. onClose navigates back.
 */

import { useRouter } from "next/navigation";
import { ImportDialog } from "@/components/projects/ImportDialog";

export function ImportDialogStandalone() {
  const router = useRouter();
  return (
    <ImportDialog
      open
      onClose={() => router.back()}
      onImported={(result) => {
        if (result?.projectId) {
          router.push(`/projects/${result.projectId}`);
        }
      }}
    />
  );
}
