import Link from "next/link";
import { db } from "@/lib/db";
import { opensimulationProjects } from "@opensoftware/db/opensimulation";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ projectId: string }> };

export default async function WorkbenchPage({ params }: Props) {
  const { projectId } = await params;

  const [project] = await db
    .select()
    .from(opensimulationProjects)
    .where(eq(opensimulationProjects.id, projectId))
    .limit(1);

  if (!project) {
    return (
      <main className="max-w-3xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-semibold">Project not found</h1>
        <p className="mt-2 text-neutral-400">
          No OpenSimulation project exists with id <code className="text-amber-400">{projectId}</code>.
        </p>
        <Link href="/" className="mt-6 inline-block underline text-amber-400">
          Back to OpenSimulation
        </Link>
      </main>
    );
  }

  return (
    <main className="max-w-4xl mx-auto px-6 py-12">
      <div className="text-xs tracking-wider text-neutral-500 uppercase">
        OpenSimulation · Workbench
      </div>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">{project.name}</h1>
      {project.description ? (
        <p className="mt-2 text-neutral-400">{project.description}</p>
      ) : null}

      <section className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
        <Stat label="Project ID" value={project.id} mono />
        <Stat label="Created" value={new Date(project.createdAt).toLocaleString()} />
        <Stat label="Updated" value={new Date(project.updatedAt).toLocaleString()} />
        <Stat label="Owner" value={project.userId} mono />
      </section>

      <section className="mt-10">
        <h2 className="text-sm tracking-wider text-neutral-500 uppercase">
          Available solvers
        </h2>
        <ul className="mt-4 space-y-3 text-neutral-300">
          <li><strong>Kinematic</strong> — <code>POST /api/solve/kinematic</code> · forward + IK</li>
          <li><strong>FEA static</strong> — <code>POST /api/solve/fea-static</code> · Cholesky linear elastic</li>
          <li><strong>Thermal steady</strong> — <code>POST /api/solve/thermal</code> · CG solver</li>
          <li><strong>Cleaning</strong> — <code>POST /api/solve/cleaning</code> · ultrasonic/CIP</li>
        </ul>
        <p className="mt-4 text-sm text-neutral-500">
          M1 ships headless solvers. A full interactive workbench UI (mesh
          picker, BC editor, results visualisation) is scheduled for M2.
        </p>
      </section>
    </main>
  );
}

function Stat({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-900/50 p-4">
      <div className="text-xs tracking-wider text-neutral-500 uppercase">{label}</div>
      <div className={`mt-1 text-sm ${mono ? "font-mono text-amber-300" : "text-neutral-200"}`}>
        {value}
      </div>
    </div>
  );
}
