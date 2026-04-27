import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import ProjectListClient from "./ProjectListClient";

export const dynamic = "force-dynamic";

export default async function WorkbenchLandingPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/workbench");
  }

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <header className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Projects</h1>
            <p className="text-sm text-neutral-400">
              Your CAM projects. Open one to enter the workbench.
            </p>
          </div>
        </header>
        <ProjectListClient />
      </div>
    </main>
  );
}
