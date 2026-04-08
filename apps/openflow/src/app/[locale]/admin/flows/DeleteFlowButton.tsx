"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

export function DeleteFlowButton({
  flowId,
  flowStatus,
}: {
  flowId: string;
  flowStatus: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  if (flowStatus !== "draft") return null;

  async function handleDelete() {
    if (!confirm("Delete this flow?")) return;

    const res = await fetch(`/api/flows/${flowId}`, { method: "DELETE" });
    if (res.ok) {
      startTransition(() => router.refresh());
    }
  }

  return (
    <button
      type="button"
      disabled={isPending}
      className="text-xs text-red-500 hover:text-red-700 font-medium disabled:opacity-50"
      onClick={handleDelete}
    >
      {isPending ? "..." : "Delete"}
    </button>
  );
}
