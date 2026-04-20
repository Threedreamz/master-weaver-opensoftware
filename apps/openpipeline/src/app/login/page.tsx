"use client";

import { Suspense, useState } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { LogIn } from "lucide-react";

function LoginForm() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/";
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleDevLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    await signIn("dev-credentials", { email, role: "editor", callbackUrl });
  }

  return (
    <div className="w-full max-w-sm mx-4">
      <div className="bg-zinc-900 rounded-2xl p-8 border border-zinc-800 shadow-2xl">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-zinc-100 mb-1">OpenPipeline</h1>
          <p className="text-sm text-zinc-500">Pipeline-Management Login</p>
        </div>

        <button
          onClick={() => { setLoading(true); signIn("finderauth", { callbackUrl }); }}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-500 disabled:opacity-50 transition-colors mb-4"
        >
          <LogIn className="w-4 h-4" />
          Mit FinderAuth anmelden
        </button>

        {process.env.NODE_ENV === "development" && (
          <>
            <div className="flex items-center gap-3 my-4">
              <div className="flex-1 h-px bg-zinc-800" />
              <span className="text-xs text-zinc-600">Dev Login</span>
              <div className="flex-1 h-px bg-zinc-800" />
            </div>

            <form onSubmit={handleDevLogin} className="space-y-3">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="E-Mail"
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <button
                type="submit"
                disabled={loading || !email.trim()}
                className="w-full px-4 py-2 rounded-lg bg-zinc-700 text-zinc-200 text-sm hover:bg-zinc-600 disabled:opacity-50"
              >
                Dev Login
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950">
      <Suspense fallback={<div className="text-zinc-500">Laden...</div>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
