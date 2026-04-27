import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { ImportClient } from "./ImportClient";

export const dynamic = "force-dynamic";

export default async function ImportPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col px-6 py-10">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold">Import geometry</h1>
        <p className="text-sm text-neutral-400">
          Upload STEP, IGES, STL, OBJ, 3MF or BREP files. Imports without a project
          context are stored in your personal scratch area.
        </p>
      </header>
      <div className="flex-1 rounded-lg border border-neutral-800 bg-neutral-900/50 p-6">
        <ImportClient />
      </div>
    </main>
  );
}
