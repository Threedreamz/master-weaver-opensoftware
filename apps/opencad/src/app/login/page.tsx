"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";

export default function LoginPage({
  searchParams,
}: {
  searchParams?: { callbackUrl?: string };
}) {
  const callbackUrl = searchParams?.callbackUrl ?? "/";
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("viewer");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isDev = process.env.NODE_ENV === "development";

  async function handleDevSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await signIn("dev-credentials", {
        email,
        role,
        redirect: false,
        callbackUrl,
      });
      if (res?.error) {
        setError(res.error);
      } else if (res?.ok) {
        window.location.href = res.url ?? callbackUrl;
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-950 px-4 text-neutral-100">
      <div className="w-full max-w-md space-y-6 rounded-2xl border border-neutral-800 bg-neutral-900 p-8 shadow-xl">
        <div className="space-y-1 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">OpenCAD</h1>
          <p className="text-sm text-neutral-400">Sign in to continue</p>
        </div>

        <button
          type="button"
          onClick={() => signIn("finderauth", { callbackUrl })}
          className="flex w-full items-center justify-center rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-400"
        >
          Sign in with FinderAuth
        </button>

        {isDev && (
          <>
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-neutral-800" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-neutral-900 px-2 text-neutral-500">
                  Dev only
                </span>
              </div>
            </div>

            <form onSubmit={handleDevSubmit} className="space-y-3">
              <div className="space-y-1">
                <label
                  htmlFor="email"
                  className="block text-xs font-medium text-neutral-400"
                >
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-md border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm text-neutral-100 placeholder-neutral-500 focus:border-indigo-500 focus:outline-none"
                  placeholder="dev@example.com"
                />
              </div>

              <div className="space-y-1">
                <label
                  htmlFor="role"
                  className="block text-xs font-medium text-neutral-400"
                >
                  Role
                </label>
                <select
                  id="role"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full rounded-md border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm text-neutral-100 focus:border-indigo-500 focus:outline-none"
                >
                  <option value="viewer">viewer</option>
                  <option value="editor">editor</option>
                  <option value="admin">admin</option>
                </select>
              </div>

              {error && (
                <p className="rounded border border-red-800/50 bg-red-950/50 px-3 py-2 text-xs text-red-300">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={submitting || !email}
                className="w-full rounded-lg border border-neutral-700 bg-neutral-800 px-4 py-2 text-sm font-medium text-neutral-100 transition hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? "Signing in…" : "Dev sign in"}
              </button>
            </form>
          </>
        )}
      </div>
    </main>
  );
}
