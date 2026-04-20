"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import AIGenerateDialog from "../../flow/[flowId]/AIGenerateDialog";

export function AIFlowButton({ locale }: { locale: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-indigo-200 bg-white text-indigo-600 text-sm font-medium hover:bg-indigo-50 transition-colors"
      >
        <Sparkles size={15} />
        Mit KI erstellen
      </button>

      {open && (
        <AIGenerateDialog onClose={() => setOpen(false)} locale={locale} />
      )}
    </>
  );
}
