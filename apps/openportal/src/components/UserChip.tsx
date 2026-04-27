"use client";

import { useSession, signIn, signOut } from "next-auth/react";

export function UserChip() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return (
      <div className="text-xs text-[var(--text-muted)]">Loading…</div>
    );
  }

  if (!session?.user) {
    return (
      <button
        type="button"
        onClick={() => signIn("finderauth")}
        className="rounded-md border border-[var(--border)] px-3 py-1 text-xs text-[var(--text-secondary)] transition-colors hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]"
      >
        Sign in with 3Dreamz
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-[var(--text-secondary)]">
        {session.user.name ?? session.user.email}
      </span>
      <button
        type="button"
        onClick={() => signOut({ callbackUrl: "/" })}
        className="text-xs text-[var(--text-muted)] underline-offset-2 hover:text-[var(--text-secondary)] hover:underline"
      >
        Sign out
      </button>
    </div>
  );
}
