import Link from "next/link";
import { ArrowLeft, Users } from "lucide-react";
import { AccountsUndGruppen } from "@/components/settings/AccountsUndGruppen";

export const dynamic = "force-dynamic";

export default function AccountsPage() {
  return (
    <div className="min-h-screen bg-zinc-950">
      <header className="border-b border-zinc-800 px-6 py-4">
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-3">
            <Users className="w-5 h-5 text-blue-400" />
            <h1 className="text-lg font-bold text-zinc-100">Accounts & Berechtigungen</h1>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-6">
        <AccountsUndGruppen />
      </main>
    </div>
  );
}
