"use client";

/**
 * Lightweight text-only FeedbackFAB for opensoftware admin panels.
 *
 * No screenshot capture, no consent complexity — just a floating button that
 * opens a small textarea and submits via a server action. This is intentionally
 * simpler than the hub FeedbackFAB (which has screenshot capture, consent
 * gating, and a full modal). Admin panels are internal surfaces; fast text
 * feedback is the primary use case.
 *
 * The caller provides `onSubmit` as a server-action reference so each app can
 * bind its own `bubble` and `app` slugs without this component needing to know
 * them.
 */

import { useRef, useState, useTransition } from "react";

export interface FeedbackFABProps {
  /** Server action that accepts { body, title, url }. Returns void or throws. */
  onSubmit: (payload: {
    body: string;
    title: string;
    url: string;
  }) => Promise<void>;
  /** Accent colour — defaults to 3Dreamz yellow */
  accent?: string;
}

export function FeedbackFAB({ onSubmit, accent = "#fec83e" }: FeedbackFABProps) {
  const [open, setOpen] = useState(false);
  const [body, setBody] = useState("");
  const [title, setTitle] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const panelRef = useRef<HTMLDivElement>(null);

  const handleOpen = () => {
    setOpen(true);
    setDone(false);
    setError(null);
  };

  const handleClose = () => {
    setOpen(false);
    setBody("");
    setTitle("");
    setDone(false);
    setError(null);
  };

  const handleSubmit = () => {
    if (!body.trim()) return;
    startTransition(async () => {
      try {
        await onSubmit({
          body: body.trim(),
          title: title.trim() || "Admin feedback",
          url: typeof window !== "undefined" ? window.location.href : "",
        });
        setDone(true);
        setBody("");
        setTitle("");
        setTimeout(() => handleClose(), 1500);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Submission failed");
      }
    });
  };

  return (
    <>
      {open && (
        <div
          ref={panelRef}
          id="feedback-fab-panel"
          className="fixed bottom-24 right-6 z-50 w-80 overflow-hidden border border-neutral-700 bg-neutral-900 shadow-2xl"
          role="dialog"
          aria-label="Send feedback"
        >
          <div className="flex items-center justify-between border-b border-neutral-700 px-4 py-3">
            <span className="text-sm font-medium text-neutral-100">
              Send feedback
            </span>
            <button
              type="button"
              onClick={handleClose}
              className="text-neutral-400 hover:text-neutral-100"
              aria-label="Close"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          </div>

          {done ? (
            <div className="px-4 py-6 text-center text-sm text-neutral-300">
              Thanks — feedback sent.
            </div>
          ) : (
            <div className="flex flex-col gap-3 p-4">
              <input
                type="text"
                placeholder="Subject (optional)"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full rounded border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm text-neutral-100 placeholder-neutral-500 focus:border-[var(--fab-accent)] focus:outline-none"
                style={{ "--fab-accent": accent } as React.CSSProperties}
                disabled={isPending}
              />
              <textarea
                placeholder="Describe the issue or suggestion…"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={4}
                className="w-full resize-none rounded border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm text-neutral-100 placeholder-neutral-500 focus:border-[var(--fab-accent)] focus:outline-none"
                style={{ "--fab-accent": accent } as React.CSSProperties}
                disabled={isPending}
              />
              {error && (
                <p className="text-xs text-red-400">{error}</p>
              )}
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isPending || !body.trim()}
                className="w-full py-2 text-sm font-medium text-black transition hover:opacity-90 disabled:opacity-40"
                style={{ background: accent }}
              >
                {isPending ? "Sending…" : "Send feedback"}
              </button>
            </div>
          )}
        </div>
      )}

      <button
        id="feedback-fab"
        type="button"
        aria-label="Send feedback"
        onClick={handleOpen}
        className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center shadow-lg shadow-black/30 transition-transform hover:scale-110 active:scale-95 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-black"
        style={{ background: accent }}
        title="Send feedback"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-6 w-6 text-black"
        >
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      </button>
    </>
  );
}
