import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { ProjectList } from "@/components/projects/ProjectList";

export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Projects</h1>
          <p className="text-sm text-neutral-400">
            Your parametric CAD projects. Open one to enter the workbench.
          </p>
        </div>
      </header>
      <ProjectList />
    </main>
  );
}
