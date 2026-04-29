import type { ReactNode } from "react";
import { FeedbackFAB } from "@opensoftware/ui";
import { submitFeedback } from "@/actions/feedback";

/**
 * OpenCAM admin shell layout.
 * Lightweight — no auth check here because the only current child
 * (/admin/cam) immediately redirects to /workbench which is auth-gated.
 * The FeedbackFAB is rendered for any future admin pages added under /admin.
 */
export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      {children}
      <FeedbackFAB onSubmit={submitFeedback} />
    </div>
  );
}
