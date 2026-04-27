import Link from "next/link";
import { db } from "@/db";
import {
  opensimulationProjects,
  opensimulationMeshes,
  opensimulationRuns,
} from "@opensoftware/db/opensimulation";
import { desc, eq } from "drizzle-orm";
import { WorkbenchClient } from "./workbench-client";

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
      <main className="min-h-screen bg-black text-neutral-200">
        <div className="max-w-3xl mx-auto px-6 py-12">
          <div className="text-xs font-mono uppercase tracking-widest text-neutral-500">
            OpenSimulation · Workbench
          </div>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            Project not found
          </h1>
          <p className="mt-2 text-neutral-400">
            No OpenSimulation project exists with id{" "}
            <code className="text-[#fec83e]">{projectId}</code>.
          </p>
          <Link
            href="/"
            className="mt-6 inline-block underline text-[#fec83e]"
          >
            Back to OpenSimulation
          </Link>
        </div>
      </main>
    );
  }

  const meshes = await db
    .select({
      id: opensimulationMeshes.id,
      kind: opensimulationMeshes.kind,
      vertexCount: opensimulationMeshes.vertexCount,
      elementCount: opensimulationMeshes.elementCount,
      source: opensimulationMeshes.source,
      sourceRef: opensimulationMeshes.sourceRef,
      createdAt: opensimulationMeshes.createdAt,
    })
    .from(opensimulationMeshes)
    .where(eq(opensimulationMeshes.projectId, projectId))
    .orderBy(desc(opensimulationMeshes.createdAt))
    .limit(50);

  const runs = await db
    .select({
      id: opensimulationRuns.id,
      domain: opensimulationRuns.domain,
      status: opensimulationRuns.status,
      durationMs: opensimulationRuns.durationMs,
      createdAt: opensimulationRuns.createdAt,
    })
    .from(opensimulationRuns)
    .where(eq(opensimulationRuns.projectId, projectId))
    .orderBy(desc(opensimulationRuns.createdAt))
    .limit(20);

  const meshesSerialised = meshes.map((m) => ({
    id: m.id,
    kind: m.kind,
    vertexCount: m.vertexCount,
    elementCount: m.elementCount,
    source: m.source,
    sourceRef: m.sourceRef ?? null,
    createdAt: new Date(m.createdAt).toISOString(),
  }));

  const runsSerialised = runs.map((r) => ({
    id: r.id,
    domain: r.domain,
    status: r.status,
    durationMs: r.durationMs ?? null,
    createdAt: new Date(r.createdAt).toISOString(),
  }));

  const projectSerialised = {
    id: project.id,
    name: project.name,
    description: project.description ?? null,
    userId: project.userId,
    createdAt: new Date(project.createdAt).toISOString(),
    updatedAt: new Date(project.updatedAt).toISOString(),
  };

  return (
    <main className="min-h-screen bg-black text-neutral-200">
      <div className="max-w-5xl mx-auto px-6 py-10">
        <div className="text-xs font-mono uppercase tracking-widest text-neutral-500">
          OpenSimulation · Workbench
        </div>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-neutral-50">
          {projectSerialised.name}
        </h1>
        {projectSerialised.description ? (
          <p className="mt-2 text-neutral-400">{projectSerialised.description}</p>
        ) : null}

        <p className="mt-3 text-xs text-neutral-500">
          Note: interactive mesh picker, BC editor, and 3D results visualisation
          are scheduled for M2. This workbench exposes the M1 solver surface as
          JSON-in / JSON-out so you can drive every solver from the browser.
        </p>

        <section className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <Stat label="Project ID" value={projectSerialised.id} mono />
          <Stat label="Owner" value={projectSerialised.userId} mono />
          <Stat
            label="Created"
            value={new Date(projectSerialised.createdAt).toLocaleString()}
          />
          <Stat
            label="Updated"
            value={new Date(projectSerialised.updatedAt).toLocaleString()}
          />
        </section>

        <WorkbenchClient
          project={projectSerialised}
          meshes={meshesSerialised}
          runs={runsSerialised}
        />

        <details className="mt-12 rounded-lg border border-neutral-800 bg-neutral-950/50 p-5 open:bg-neutral-900/30">
          <summary className="cursor-pointer text-xs font-mono uppercase tracking-widest text-neutral-400">
            Available solvers (reference)
          </summary>
          <ul className="mt-4 space-y-3 text-sm text-neutral-300">
            <li>
              <strong>Kinematic</strong> —{" "}
              <code className="text-[#fec83e]">POST /api/solve/kinematic</code> ·
              forward + IK
            </li>
            <li>
              <strong>FEA static</strong> —{" "}
              <code className="text-[#fec83e]">POST /api/solve/fea-static</code> ·
              Cholesky linear elastic
            </li>
            <li>
              <strong>Thermal steady</strong> —{" "}
              <code className="text-[#fec83e]">POST /api/solve/thermal</code> ·
              CG solver
            </li>
            <li>
              <strong>Cleaning</strong> —{" "}
              <code className="text-[#fec83e]">POST /api/solve/cleaning</code> ·
              ultrasonic / CIP emulator
            </li>
          </ul>
          <p className="mt-4 text-xs text-neutral-500">
            M1 ships these four solvers headless. Modal + rigid-body are
            scheduled for M2.
          </p>
        </details>
      </div>
    </main>
  );
}

function Stat({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-950/60 p-4">
      <div className="text-[10px] font-mono uppercase tracking-widest text-neutral-500">
        {label}
      </div>
      <div
        className={
          "mt-1 text-sm " +
          (mono ? "font-mono text-[#fec83e] break-all" : "text-neutral-200")
        }
      >
        {value}
      </div>
    </div>
  );
}
