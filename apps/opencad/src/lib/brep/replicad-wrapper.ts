/**
 * opencad — BREP-exact ops via `replicad` (OpenCascade.js WASM) with mesh
 * approximation fallback.
 *
 * `replicad` is an optional peer — this wrapper probes for it at runtime and
 * delegates to the mesh-approximate primitives in `cad-kernel.ts` and
 * `ops/{shell,draft}.ts` when replicad is absent or its OCCT WASM fails to
 * initialise. All four public functions return drop-in `SolidResult`s so
 * callers can switch between BREP and mesh paths transparently.
 *
 * Availability is probed once per process and cached. On the fallback path,
 * a warning is emitted ONCE per process (via `warnedOnce`) so hot loops
 * don't spam the log.
 *
 * Units: millimetres. Node-compatible.
 */
import * as THREE from "three";
import type { SolidResult } from "../cad-kernel";

/* --------------------------------------------------------------- types */

export type BrepAvailability = "available" | "not-installed" | "wasm-failed";

/* ----------------------------------------------------------- probe cache */

type ReplicadHandle = {
  mod: Record<string, unknown>;
  oc: unknown;
};

let probeCache: BrepAvailability | null = null;
let replicadHandle: ReplicadHandle | null = null;
const warnedOnce = new Set<string>();

/** Timeout in ms for the OCCT WASM initialiser. */
const WASM_INIT_TIMEOUT_MS = 5000;

/** Promise wrapper around a timeout — resolves `"timeout"` after `ms`. */
function timeoutPromise(ms: number): Promise<"timeout"> {
  return new Promise((resolve) => {
    setTimeout(() => resolve("timeout"), ms);
  });
}

/**
 * Probe replicad availability. Caches the result — subsequent calls are O(1).
 * Return semantics:
 *   - `"available"`       — package imported AND OCCT WASM initialised within 5s
 *   - `"not-installed"`   — `import('replicad')` rejected (MODULE_NOT_FOUND etc.)
 *   - `"wasm-failed"`     — import OK but `initOpenCascade()` threw or timed out
 */
export async function probeBrep(): Promise<BrepAvailability> {
  if (probeCache !== null) return probeCache;

  let mod: Record<string, unknown>;
  try {
    // Dynamic import — resolved lazily so the module loads cleanly without replicad.
    // @ts-expect-error — replicad is an optional dep; module missing at typecheck is fine.
    mod = (await import(/* webpackIgnore: true */ "replicad")) as Record<string, unknown>;
  } catch {
    probeCache = "not-installed";
    return probeCache;
  }

  // replicad exposes `initOpenCascade()` as a named export. Its signature is
  // async — it resolves to an OCCT handle once the WASM is instantiated.
  const init = mod.initOpenCascade as (() => Promise<unknown>) | undefined;
  if (typeof init !== "function") {
    probeCache = "wasm-failed";
    return probeCache;
  }

  try {
    const race = await Promise.race([init(), timeoutPromise(WASM_INIT_TIMEOUT_MS)]);
    if (race === "timeout") {
      probeCache = "wasm-failed";
      return probeCache;
    }
    replicadHandle = { mod, oc: race };
    probeCache = "available";
    return probeCache;
  } catch {
    probeCache = "wasm-failed";
    return probeCache;
  }
}

/** Test-only reset. Clears cached probe result + warnings + handle. */
export function __resetBrepCacheForTests(): void {
  probeCache = null;
  replicadHandle = null;
  warnedOnce.clear();
}

/* ------------------------------------------------------- fallback helpers */

function warnFallback(op: string, reason: BrepAvailability): void {
  const key = `${op}:${reason}`;
  if (warnedOnce.has(key)) return;
  warnedOnce.add(key);
  // eslint-disable-next-line no-console
  console.warn(
    `[opencad:brep] ${op} falling back to mesh approximation (replicad ${reason})`
  );
}

/* ---------------------------------------------------- BREP → replicad path */

type ReplicadSolid = {
  fillet?: (radius: number, edges?: unknown) => ReplicadSolid;
  chamfer?: (distance: number, edges?: unknown) => ReplicadSolid;
  shell?: (thickness: number, opts?: unknown) => ReplicadSolid;
  draft?: (neutralPlane: unknown, angleDeg: number) => ReplicadSolid;
  mesh?: (opts?: { tolerance?: number; angularTolerance?: number }) => {
    vertices?: Float32Array | number[];
    triangles?: Uint32Array | Uint16Array | number[];
    normals?: Float32Array | number[];
  };
};

/**
 * Convert a Three BufferGeometry into a replicad Solid.
 *
 * replicad's mesh→solid path goes through `importSTL` or `makeSolid` depending
 * on the installed version — both are best-effort and may reject non-manifold
 * input. Returns `null` if the handle doesn't expose a mesh importer.
 */
function geometryToReplicadSolid(geom: THREE.BufferGeometry): ReplicadSolid | null {
  if (!replicadHandle) return null;
  const { mod } = replicadHandle;

  // Try `makeSolid` first — replicad exposes this for mesh-to-BREP conversion
  // in newer versions. Fall back to `importSTL` via a synthesised STL blob.
  const makeSolid = mod.makeSolid as ((m: unknown) => ReplicadSolid) | undefined;
  if (typeof makeSolid === "function") {
    const pos = geom.getAttribute("position");
    const idx = geom.getIndex();
    const triCount = idx ? idx.count / 3 : (pos?.count ?? 0) / 3;
    if (!pos || triCount === 0) return null;
    const vertices: number[] = [];
    for (let i = 0; i < pos.count; i += 1) {
      vertices.push(pos.getX(i), pos.getY(i), pos.getZ(i));
    }
    const triangles: number[] = [];
    for (let t = 0; t < triCount; t += 1) {
      const i0 = idx ? idx.getX(t * 3 + 0) : t * 3 + 0;
      const i1 = idx ? idx.getX(t * 3 + 1) : t * 3 + 1;
      const i2 = idx ? idx.getX(t * 3 + 2) : t * 3 + 2;
      triangles.push(i0, i1, i2);
    }
    try {
      return makeSolid({ vertices, triangles });
    } catch {
      return null;
    }
  }

  return null;
}

/** Convert a replicad Solid back to a Three BufferGeometry via `.mesh()`. */
function replicadSolidToGeometry(solid: ReplicadSolid): THREE.BufferGeometry | null {
  if (typeof solid.mesh !== "function") return null;
  let meshed: ReturnType<NonNullable<ReplicadSolid["mesh"]>>;
  try {
    meshed = solid.mesh({ tolerance: 0.01 });
  } catch {
    return null;
  }
  const verts = meshed.vertices;
  const tris = meshed.triangles;
  if (!verts || !tris) return null;
  const geom = new THREE.BufferGeometry();
  const positionArray =
    verts instanceof Float32Array ? verts : new Float32Array(verts as number[]);
  geom.setAttribute("position", new THREE.BufferAttribute(positionArray, 3));
  const indexArray =
    tris instanceof Uint32Array || tris instanceof Uint16Array
      ? tris
      : new Uint32Array(tris as number[]);
  geom.setIndex(new THREE.BufferAttribute(indexArray, 1));
  if (meshed.normals) {
    const nrmArray =
      meshed.normals instanceof Float32Array
        ? meshed.normals
        : new Float32Array(meshed.normals as number[]);
    geom.setAttribute("normal", new THREE.BufferAttribute(nrmArray, 3));
  } else {
    geom.computeVertexNormals();
  }
  return geom;
}

/** Wrap a BufferGeometry into a SolidResult (bbox + volume). */
async function toSolidResult(geom: THREE.BufferGeometry): Promise<SolidResult> {
  const { exportBoundingBox, computeVolumeMm3 } = await import("../cad-kernel");
  geom.computeVertexNormals();
  return {
    mesh: geom,
    bbox: exportBoundingBox(geom),
    volumeMm3: computeVolumeMm3(geom),
  };
}

/* ---------------------------------------------------------- public ops */

/**
 * BREP-exact edge fillet. Falls back to `cad-kernel.fillet` mesh
 * approximation when replicad is unavailable.
 */
export async function brepFillet(
  geom: THREE.BufferGeometry,
  radius: number,
  edgeSelector?: (edgeIndex: number) => boolean
): Promise<SolidResult> {
  const availability = await probeBrep();

  if (availability !== "available") {
    warnFallback("brepFillet", availability);
    const { fillet } = await import("../cad-kernel");
    return fillet(geom, radius, edgeSelector);
  }

  const solid = geometryToReplicadSolid(geom);
  if (!solid || typeof solid.fillet !== "function") {
    warnFallback("brepFillet", "wasm-failed");
    const { fillet } = await import("../cad-kernel");
    return fillet(geom, radius, edgeSelector);
  }

  try {
    const filleted = solid.fillet(radius);
    const outGeom = replicadSolidToGeometry(filleted);
    if (!outGeom) throw new Error("mesh conversion failed");
    return toSolidResult(outGeom);
  } catch {
    warnFallback("brepFillet", "wasm-failed");
    const { fillet } = await import("../cad-kernel");
    return fillet(geom, radius, edgeSelector);
  }
}

/**
 * BREP-exact edge chamfer. Falls back to `cad-kernel.chamfer` mesh
 * approximation when replicad is unavailable.
 */
export async function brepChamfer(
  geom: THREE.BufferGeometry,
  distance: number
): Promise<SolidResult> {
  const availability = await probeBrep();

  if (availability !== "available") {
    warnFallback("brepChamfer", availability);
    const { chamfer } = await import("../cad-kernel");
    return chamfer(geom, distance);
  }

  const solid = geometryToReplicadSolid(geom);
  if (!solid || typeof solid.chamfer !== "function") {
    warnFallback("brepChamfer", "wasm-failed");
    const { chamfer } = await import("../cad-kernel");
    return chamfer(geom, distance);
  }

  try {
    const chamfered = solid.chamfer(distance);
    const outGeom = replicadSolidToGeometry(chamfered);
    if (!outGeom) throw new Error("mesh conversion failed");
    return toSolidResult(outGeom);
  } catch {
    warnFallback("brepChamfer", "wasm-failed");
    const { chamfer } = await import("../cad-kernel");
    return chamfer(geom, distance);
  }
}

/**
 * BREP-exact shell (thickness inward). Falls back to `ops/shell.shell` mesh
 * approximation when replicad is unavailable.
 */
export async function brepShell(
  geom: THREE.BufferGeometry,
  thickness: number
): Promise<SolidResult> {
  const availability = await probeBrep();

  if (availability !== "available") {
    warnFallback("brepShell", availability);
    const { shell } = await import("../ops/shell");
    return shell(geom, thickness);
  }

  const solid = geometryToReplicadSolid(geom);
  if (!solid || typeof solid.shell !== "function") {
    warnFallback("brepShell", "wasm-failed");
    const { shell } = await import("../ops/shell");
    return shell(geom, thickness);
  }

  try {
    const shelled = solid.shell(thickness);
    const outGeom = replicadSolidToGeometry(shelled);
    if (!outGeom) throw new Error("mesh conversion failed");
    return toSolidResult(outGeom);
  } catch {
    warnFallback("brepShell", "wasm-failed");
    const { shell } = await import("../ops/shell");
    return shell(geom, thickness);
  }
}

/**
 * BREP-exact draft (face taper around a neutral plane). Falls back to
 * `ops/draft.draft` mesh approximation when replicad is unavailable.
 */
export async function brepDraft(
  geom: THREE.BufferGeometry,
  neutralZ: number,
  angleDeg: number
): Promise<SolidResult> {
  const availability = await probeBrep();

  if (availability !== "available") {
    warnFallback("brepDraft", availability);
    const { draft } = await import("../ops/draft");
    return draft(geom, neutralZ, angleDeg, { pullAxis: "z" });
  }

  const solid = geometryToReplicadSolid(geom);
  if (!solid || typeof solid.draft !== "function") {
    warnFallback("brepDraft", "wasm-failed");
    const { draft } = await import("../ops/draft");
    return draft(geom, neutralZ, angleDeg, { pullAxis: "z" });
  }

  try {
    const drafted = solid.draft({ z: neutralZ }, angleDeg);
    const outGeom = replicadSolidToGeometry(drafted);
    if (!outGeom) throw new Error("mesh conversion failed");
    return toSolidResult(outGeom);
  } catch {
    warnFallback("brepDraft", "wasm-failed");
    const { draft } = await import("../ops/draft");
    return draft(geom, neutralZ, angleDeg, { pullAxis: "z" });
  }
}
