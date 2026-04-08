"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, useRef, useEffect } from "react";

export function FlowActions({
  flowId,
  flowStatus,
}: {
  flowId: string;
  flowStatus: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function handleDuplicate() {
    setOpen(false);
    const res = await fetch(`/api/flows/${flowId}/duplicate`, {
      method: "POST",
    });
    if (res.ok) {
      startTransition(() => router.refresh());
    }
  }

  async function handleArchive() {
    setOpen(false);
    if (!confirm("Diesen Flow archivieren?")) return;
    const res = await fetch(`/api/flows/${flowId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "archived" }),
    });
    if (res.ok) {
      startTransition(() => router.refresh());
    }
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        disabled={isPending}
        onClick={() => setOpen((v) => !v)}
        className="text-xs text-gray-500 hover:text-gray-700 font-medium px-1.5 py-0.5 rounded hover:bg-gray-100 disabled:opacity-50"
      >
        {isPending ? "..." : "\u2026"}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 z-10 w-40 rounded-lg border border-gray-200 bg-white shadow-lg py-1 text-sm">
          <button
            type="button"
            onClick={handleDuplicate}
            className="w-full text-left px-3 py-1.5 hover:bg-gray-50 text-gray-700"
          >
            Duplizieren
          </button>
          {flowStatus !== "archived" && (
            <button
              type="button"
              onClick={handleArchive}
              className="w-full text-left px-3 py-1.5 hover:bg-gray-50 text-gray-700"
            >
              Archivieren
            </button>
          )}
        </div>
      )}
    </div>
  );
}
