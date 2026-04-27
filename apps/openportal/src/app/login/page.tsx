"use client";

import Link from "next/link";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function LoginInner() {
  const params = useSearchParams();
  const callbackUrl = params.get("callbackUrl") ?? "/";

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
      <div className="text-xs uppercase tracking-widest text-[var(--text-muted)]">
        OpenSoftware &middot; OpenPortal
      </div>
      <h1 className="mt-2 text-3xl font-semibold text-[var(--text-primary)]">
        Sign in
      </h1>
      <p className="mt-2 text-sm text-[var(--text-secondary)]">
        Use your 3Dreamz account to sign in. Your name will be pre-filled in
        calls and you can manage future meetings.
      </p>

      <button
        type="button"
        onClick={() => signIn("finderauth", { callbackUrl })}
        className="mt-6 inline-flex items-center justify-center rounded-md bg-[var(--color-brand)] px-4 py-2 text-sm font-medium text-[var(--text-inverse)] transition-colors hover:bg-[var(--color-brand-dark)]"
      >
        Sign in with 3Dreamz
      </button>

      <p className="mt-4 text-xs text-[var(--text-muted)]">
        Calls work without signing in &mdash; just open the call link directly.
      </p>

      <Link
        href="/"
        className="mt-12 text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
      >
        &larr; Back to portal
      </Link>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<main className="p-6 text-sm text-[var(--text-muted)]">Loading…</main>}>
      <LoginInner />
    </Suspense>
  );
}
