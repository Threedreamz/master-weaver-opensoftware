"use client";

import { useMemo, useState } from "react";

type ProjectInfo = {
  id: string;
  name: string;
  description: string | null;
  userId: string;
  createdAt: string;
  updatedAt: string;
};

type MeshRow = {
  id: string;
  kind: "tri" | "tet";
  vertexCount: number;
  elementCount: number;
  source: "opencad" | "manual" | "upload";
  sourceRef: string | null;
  createdAt: string;
};

type RunRow = {
  id: string;
  domain: "kinematic-fwd" | "kinematic-ik" | "fea-static" | "thermal-steady" | "cleaning";
  status: "pending" | "running" | "done" | "failed";
  durationMs: number | null;
  createdAt: string;
};

type SolverKey = "fea-static" | "thermal" | "kinematic" | "cleaning";

const SOLVERS: Array<{
  key: SolverKey;
  label: string;
  endpoint: string;
  blurb: string;
}> = [
  {
    key: "fea-static",
    label: "FEA Static",
    endpoint: "/api/solve/fea-static",
    blurb: "Cholesky linear-elastic stress + displacement.",
  },
  {
    key: "thermal",
    label: "Thermal Steady",
    endpoint: "/api/solve/thermal",
    blurb: "Conjugate-gradient steady-state heat conduction.",
  },
  {
    key: "kinematic",
    label: "Kinematic",
    endpoint: "/api/solve/kinematic",
    blurb: "Forward kinematics + damped-least-squares IK.",
  },
  {
    key: "cleaning",
    label: "Cleaning",
    endpoint: "/api/solve/cleaning",
    blurb: "Ultrasonic / CIP cleaning-cycle emulator.",
  },
];

function buildExamplePayload(
  key: SolverKey,
  meshId: string | undefined,
  projectId: string,
): unknown {
  switch (key) {
    case "fea-static":
      return {
        meshId: meshId ?? "<replace-with-meshId>",
        material: { youngModulus: 210e9, poisson: 0.3, density: 7850 },
        boundaryConditions: [
          { kind: "fix", nodeIds: [0, 1, 2] },
          { kind: "load", nodeIds: [10, 11], magnitude: { x: 0, y: -1000, z: 0 } },
        ],
      };
    case "thermal":
      return {
        meshId: meshId ?? "<replace-with-meshId>",
        material: { thermalConductivity: 50.2 },
        boundaryConditions: [
          { kind: "temperature", nodeIds: [0, 1, 2], value: 100 },
          { kind: "temperature", nodeIds: [50, 51, 52], value: 20 },
        ],
      };
    case "kinematic":
      return {
        mode: "fwd",
        joints: [
          { name: "base", axis: "z", angle: 0, offset: { x: 0, y: 0, z: 0 } },
          { name: "shoulder", axis: "y", angle: 0.5, offset: { x: 0, y: 0, z: 0.3 } },
          { name: "elbow", axis: "y", angle: -0.8, offset: { x: 0, y: 0, z: 0.25 } },
        ],
      };
    case "cleaning":
      return {
        partId: "demo-part",
        strategy: "ultrasonic",
        mode: "cycle",
        projectId,
      };
  }
}

export function WorkbenchClient({
  project,
  meshes,
  runs,
}: {
  project: ProjectInfo;
  meshes: MeshRow[];
  runs: RunRow[];
}) {
  return (
    <div className="mt-10 space-y-6">
      <MeshList meshes={meshes} />

      <section>
        <h2 className="text-xs font-mono uppercase tracking-widest text-neutral-400">
          Solvers
        </h2>
        <p className="mt-1 text-xs text-neutral-500">
          Each section sends raw JSON to the matching{" "}
          <code className="text-[#fec83e]">/api/solve/*</code> endpoint with the
          project id forwarded as <code className="text-[#fec83e]">x-project-id</code>.
        </p>
        <div className="mt-4 space-y-3">
          {SOLVERS.map((s) => (
            <SolverPanel
              key={s.key}
              solver={s}
              projectId={project.id}
              meshes={meshes}
            />
          ))}
        </div>
      </section>

      <RunHistory runs={runs} />
    </div>
  );
}

/* ------------------------------------------------------------------ MeshList */

function MeshList({ meshes }: { meshes: MeshRow[] }) {
  return (
    <section>
      <h2 className="text-xs font-mono uppercase tracking-widest text-neutral-400">
        Imported meshes ({meshes.length})
      </h2>
      {meshes.length === 0 ? (
        <p className="mt-2 text-sm text-neutral-500">
          No meshes imported yet. Use{" "}
          <code className="text-[#fec83e]">POST /api/opencad/import</code> to
          pull geometry from an opencad project, then return here — the meshId
          will be auto-prefilled in solver payloads.
        </p>
      ) : (
        <div className="mt-3 overflow-x-auto rounded-lg border border-neutral-800">
          <table className="w-full text-xs">
            <thead className="bg-neutral-950/80 text-neutral-500">
              <tr>
                <Th>Mesh ID</Th>
                <Th>Kind</Th>
                <Th>Verts</Th>
                <Th>Elements</Th>
                <Th>Source</Th>
                <Th>Created</Th>
              </tr>
            </thead>
            <tbody>
              {meshes.map((m) => (
                <tr key={m.id} className="border-t border-neutral-800/60">
                  <Td mono>{m.id}</Td>
                  <Td>{m.kind}</Td>
                  <Td>{m.vertexCount.toLocaleString()}</Td>
                  <Td>{m.elementCount.toLocaleString()}</Td>
                  <Td>{m.source}</Td>
                  <Td>{new Date(m.createdAt).toLocaleString()}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

/* --------------------------------------------------------------- SolverPanel */

function SolverPanel({
  solver,
  projectId,
  meshes,
}: {
  solver: { key: SolverKey; label: string; endpoint: string; blurb: string };
  projectId: string;
  meshes: MeshRow[];
}) {
  const initialMeshId = useMemo(
    () => meshes.find((m) => m.kind === "tet")?.id ?? meshes[0]?.id,
    [meshes],
  );
  const initialPayload = useMemo(
    () =>
      JSON.stringify(
        buildExamplePayload(solver.key, initialMeshId, projectId),
        null,
        2,
      ),
    [solver.key, initialMeshId, projectId],
  );

  const [open, setOpen] = useState(false);
  const [payload, setPayload] = useState(initialPayload);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<unknown>(null);
  const [error, setError] = useState<string | null>(null);
  const [statusCode, setStatusCode] = useState<number | null>(null);

  async function invoke() {
    setBusy(true);
    setError(null);
    setResult(null);
    setStatusCode(null);
    let parsed: unknown;
    try {
      parsed = JSON.parse(payload);
    } catch (e) {
      setError(`Local JSON parse error: ${(e as Error).message}`);
      setBusy(false);
      return;
    }
    try {
      const res = await fetch(solver.endpoint, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-project-id": projectId,
        },
        body: JSON.stringify(parsed),
      });
      setStatusCode(res.status);
      const text = await res.text();
      let data: unknown;
      try {
        data = JSON.parse(text);
      } catch {
        data = { raw: text };
      }
      if (!res.ok) {
        setError(
          typeof (data as { error?: string })?.error === "string"
            ? (data as { error: string }).error
            : `HTTP ${res.status}`,
        );
      }
      setResult(data);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-950/60 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-neutral-900/60"
      >
        <div className="flex items-center gap-3">
          <span className="text-[#fec83e]" aria-hidden>
            {open ? "▾" : "▸"}
          </span>
          <span className="text-sm font-medium text-neutral-100">
            {solver.label}
          </span>
          <code className="text-xs text-neutral-500">{solver.endpoint}</code>
        </div>
        <span className="text-xs text-neutral-500">{solver.blurb}</span>
      </button>

      {open ? (
        <div className="border-t border-neutral-800 p-4 space-y-3">
          <div>
            <label className="text-[10px] font-mono uppercase tracking-widest text-neutral-500">
              Request payload (JSON)
            </label>
            <textarea
              value={payload}
              onChange={(e) => setPayload(e.target.value)}
              spellCheck={false}
              rows={14}
              className="mt-1 w-full rounded border border-neutral-800 bg-black/80 px-3 py-2 font-mono text-xs text-neutral-200 focus:border-[#fec83e] focus:outline-none"
            />
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={invoke}
              disabled={busy}
              className="inline-flex items-center gap-2 rounded bg-[#fec83e] px-4 py-1.5 text-xs font-mono uppercase tracking-widest text-black hover:bg-[#ffd460] disabled:opacity-40"
            >
              {busy ? "Invoking…" : "Invoke"}
            </button>
            <button
              type="button"
              onClick={() => setPayload(initialPayload)}
              className="text-xs font-mono uppercase tracking-widest text-neutral-400 hover:text-neutral-200"
            >
              Reset
            </button>
            {statusCode !== null ? (
              <span
                className={
                  "text-xs font-mono " +
                  (statusCode >= 200 && statusCode < 300
                    ? "text-emerald-400"
                    : "text-rose-400")
                }
              >
                HTTP {statusCode}
              </span>
            ) : null}
          </div>

          {error ? (
            <div className="rounded border border-rose-800/60 bg-rose-950/30 p-3 text-xs text-rose-300">
              {error}
            </div>
          ) : null}

          {result !== null ? (
            <ResultView solverKey={solver.key} data={result} />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

/* ----------------------------------------------------------------- ResultView */

function ResultView({
  solverKey,
  data,
}: {
  solverKey: SolverKey;
  data: unknown;
}) {
  if (!data || typeof data !== "object") {
    return <pre className="text-xs text-neutral-400">{String(data)}</pre>;
  }
  const obj = data as Record<string, unknown>;

  // Best-effort: split arrays into a sample table, scalars into a key-value
  // grid. Unknown shapes fall back to JSON.
  const arrayEntries: Array<[string, number[]]> = [];
  const scalarEntries: Array<[string, unknown]> = [];
  const otherEntries: Array<[string, unknown]> = [];

  for (const [k, v] of Object.entries(obj)) {
    if (
      Array.isArray(v) &&
      v.length > 0 &&
      v.every((x) => typeof x === "number")
    ) {
      arrayEntries.push([k, v as number[]]);
    } else if (
      typeof v === "number" ||
      typeof v === "string" ||
      typeof v === "boolean"
    ) {
      scalarEntries.push([k, v]);
    } else {
      otherEntries.push([k, v]);
    }
  }

  return (
    <div className="space-y-3">
      <div className="text-[10px] font-mono uppercase tracking-widest text-neutral-500">
        Result · {solverKey}
      </div>

      {scalarEntries.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {scalarEntries.map(([k, v]) => (
            <div
              key={k}
              className="rounded border border-neutral-800 bg-neutral-950/80 p-2"
            >
              <div className="text-[10px] font-mono uppercase tracking-widest text-neutral-500">
                {k}
              </div>
              <div className="mt-0.5 text-xs font-mono text-neutral-100 break-all">
                {typeof v === "number" ? formatNumber(v) : String(v)}
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {arrayEntries.map(([k, v]) => (
        <ArrayPreview key={k} name={k} values={v} />
      ))}

      {otherEntries.map(([k, v]) => (
        <div key={k}>
          <div className="text-[10px] font-mono uppercase tracking-widest text-neutral-500">
            {k}
          </div>
          <pre className="mt-1 max-h-64 overflow-auto rounded border border-neutral-800 bg-black/80 p-2 text-[11px] text-neutral-300">
            {JSON.stringify(v, null, 2)}
          </pre>
        </div>
      ))}
    </div>
  );
}

function ArrayPreview({ name, values }: { name: string; values: number[] }) {
  const sample = values.slice(0, 12);
  const min = values.length > 0 ? Math.min(...values) : 0;
  const max = values.length > 0 ? Math.max(...values) : 0;
  const sum = values.reduce((a, b) => a + b, 0);
  const mean = values.length > 0 ? sum / values.length : 0;
  return (
    <div>
      <div className="flex items-center justify-between">
        <div className="text-[10px] font-mono uppercase tracking-widest text-neutral-500">
          {name} · n={values.length.toLocaleString()}
        </div>
        <div className="text-[10px] font-mono text-neutral-500">
          min {formatNumber(min)} · mean {formatNumber(mean)} · max{" "}
          {formatNumber(max)}
        </div>
      </div>
      <div className="mt-1 overflow-x-auto rounded border border-neutral-800">
        <table className="w-full text-[11px] font-mono">
          <thead className="bg-neutral-950/80 text-neutral-500">
            <tr>
              <Th>idx</Th>
              <Th>value</Th>
            </tr>
          </thead>
          <tbody>
            {sample.map((v, i) => (
              <tr key={i} className="border-t border-neutral-800/60">
                <Td mono>{i}</Td>
                <Td mono>{formatNumber(v)}</Td>
              </tr>
            ))}
            {values.length > sample.length ? (
              <tr className="border-t border-neutral-800/60">
                <Td mono>…</Td>
                <Td>
                  <span className="text-neutral-500">
                    {(values.length - sample.length).toLocaleString()} more
                  </span>
                </Td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ----------------------------------------------------------------- RunHistory */

function RunHistory({ runs }: { runs: RunRow[] }) {
  return (
    <section>
      <h2 className="text-xs font-mono uppercase tracking-widest text-neutral-400">
        Recent runs ({runs.length})
      </h2>
      {runs.length === 0 ? (
        <p className="mt-2 text-sm text-neutral-500">
          No runs yet — invoke a solver above.
        </p>
      ) : (
        <div className="mt-3 overflow-x-auto rounded-lg border border-neutral-800">
          <table className="w-full text-xs">
            <thead className="bg-neutral-950/80 text-neutral-500">
              <tr>
                <Th>Run ID</Th>
                <Th>Domain</Th>
                <Th>Status</Th>
                <Th>Duration</Th>
                <Th>Created</Th>
              </tr>
            </thead>
            <tbody>
              {runs.map((r) => (
                <tr key={r.id} className="border-t border-neutral-800/60">
                  <Td mono>{r.id}</Td>
                  <Td>{r.domain}</Td>
                  <Td>
                    <span
                      className={
                        r.status === "done"
                          ? "text-emerald-400"
                          : r.status === "failed"
                            ? "text-rose-400"
                            : "text-neutral-300"
                      }
                    >
                      {r.status}
                    </span>
                  </Td>
                  <Td>{r.durationMs != null ? `${r.durationMs} ms` : "—"}</Td>
                  <Td>{new Date(r.createdAt).toLocaleString()}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

/* ---------------------------------------------------------------------- atoms */

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-3 py-1.5 text-left font-mono uppercase tracking-widest text-[10px]">
      {children}
    </th>
  );
}

function Td({
  children,
  mono,
}: {
  children: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <td
      className={
        "px-3 py-1.5 align-top text-neutral-200 " +
        (mono ? "font-mono break-all" : "")
      }
    >
      {children}
    </td>
  );
}

function formatNumber(n: number): string {
  if (!Number.isFinite(n)) return String(n);
  if (n === 0) return "0";
  const abs = Math.abs(n);
  if (abs >= 1e6 || abs < 1e-3) return n.toExponential(3);
  return n.toLocaleString(undefined, { maximumFractionDigits: 6 });
}
