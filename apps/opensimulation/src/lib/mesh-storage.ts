/**
 * opensimulation — shared TetMesh storage I/O helpers.
 *
 * Why centralised: every solver route (`fea-static`, `thermal`, future
 * `kinematic` etc.) needs the same two operations:
 *   1. Decode an inline `{ vertices, tets }` body into a canonical TetMesh.
 *   2. Resolve a stored `meshId` row → TetMesh by reading
 *      `opensimulationMeshes.storageKey` ("inline:<base64 of TetMesh JSON>"
 *      in M1; future blob-storage protocols will be added behind the same
 *      function signature).
 *
 * Prior bug (known-pitfalls 2026-04-22): each solver route ran its own
 * `tetMeshFromMeshId()` copy. When the writer encoding changed
 * (`base64(JSON)` instead of plain JSON), only one read site was updated;
 * the other route silently 422'd "invalid JSON" until the second copy was
 * also patched. Centralising the helpers eliminates this drift class.
 */

import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { SolverError, bboxOfVertices, type TetMesh } from "@/lib/kernel-types";

/**
 * Build a TetMesh from an inline `{ vertices: number[], tets: number[] }` —
 * the request shape from `Solve*Body.mesh`. Re-packs into the canonical
 * Float32Array/Uint32Array containers the solvers expect.
 */
export function tetMeshFromInline(inline: { vertices: number[]; tets: number[] }): TetMesh {
  if (inline.vertices.length === 0 || inline.tets.length === 0) {
    throw new SolverError("BAD_INPUT", "mesh has empty vertices or tets array");
  }
  const vertices = Float32Array.from(inline.vertices);
  const tets = Uint32Array.from(inline.tets);
  return { vertices, tets, bbox: bboxOfVertices(vertices) };
}

/**
 * Resolve `meshId` → TetMesh by reading `opensimulationMeshes.storageKey`.
 * M1 storage protocol: when the key starts with `"inline:"` the suffix is a
 * base64-encoded JSON `{ vertices, tets }`. Real blob storage (R2, S3) is M2.
 *
 * Throws SolverError("BAD_INPUT", ...) on every malformed-input class — the
 * caller maps it to HTTP 422.
 */
export async function tetMeshFromMeshId(meshId: string): Promise<TetMesh> {
  const [row] = await db
    .select()
    .from(schema.opensimulationMeshes)
    .where(eq(schema.opensimulationMeshes.id, meshId))
    .limit(1);
  if (!row) throw new SolverError("BAD_INPUT", `mesh ${meshId} not found`);
  if (row.kind !== "tet") {
    throw new SolverError("BAD_INPUT", `mesh ${meshId} is ${row.kind}, expected tet`);
  }
  if (!row.storageKey.startsWith("inline:")) {
    throw new SolverError("BAD_INPUT", `mesh ${meshId} storage ${row.storageKey} not supported in M1`);
  }
  let parsed: { vertices: number[]; tets: number[] };
  try {
    const encoded = row.storageKey.slice("inline:".length);
    const decoded = Buffer.from(encoded, "base64").toString("utf8");
    parsed = JSON.parse(decoded);
  } catch {
    throw new SolverError("BAD_INPUT", `mesh ${meshId} inline payload invalid JSON`);
  }
  return tetMeshFromInline(parsed);
}
