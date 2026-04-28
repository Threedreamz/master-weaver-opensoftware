"use client";

import Link from "next/link";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function LoginInner() {
  const params = useSearchParams();
  const callbackUrl = params.get("callbackUrl") ?? "/";

  return (
    <main className="mx-auto max-w-md px-6 py-20">
      <h1 className="text-3xl font-semibold tracking-tight text-[var(--text-primary)]">
        Sign in
      </h1>

      <button
        type="button"
        onClick={() => signIn("finderauth", { callbackUrl })}
        className="mt-8 inline-flex items-center justify-center rounded-md bg-[var(--color-brand)] px-4 py-2 text-sm font-medium text-[var(--text-inverse)] transition-colors hover:bg-[var(--color-brand-dark)]"
      >
        Sign in with 3Dreamz
      </button>

      <p className="mt-6 text-xs text-[var(--text-muted)]">
        Calls work without signing in.
      </p>

      <Link
        href="/"
        className="mt-12 inline-block text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
      >
        &larr; Back
      </Link>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main className="p-6 text-sm text-[var(--text-muted)]">Loading…</main>
      }
    >
      <LoginInner />
    </Suspense>
  );
}
