/**
 * opencad — `group` / `ungroup` CAD operation (Tinkercad-style).
 *
 * Merge N geometries into a single SolidResult. Each member has an id (used
 * for ungroup) and an optional mode:
 *   - 'solid' (default) contributes positive material
 *   - 'hole' is subtracted from the accumulated solid (Tinkercad hole-mode)
 *
 * Algorithm:
 *   1. Accumulate all 'solid' members by CSG-union when three-bvh-csg is
 *      available, else concatenate their position/index buffers as disjoint
 *      geometry (no boolean — visually correct for non-overlapping parts,
 *      leaves interior faces on overlap).
 *   2. For each 'hole' member, CSG-subtract from the accumulator. If csg is
 *      missing, skip the subtraction with a console.warn (the kernel's
 *      `booleanOp` already warns — we add a second line so the group-level
 *      degradation is visible in logs).
 *   3. Recompute vertex normals so downstream shading is clean.
 *   4. Return a SolidResult extended with `memberIds` preserving input order.
 *
 * Server-safe (no DOM). Units: mm.
 *
 * Replicad TODO: once OCCT BREP is vendored, group should produce a real
 * compound solid (for fillets/chamfers across member boundaries) rather than
 * a baked triangle mesh. Signature is stable for that swap.
 */
import * as THREE from "three";
import {
  type SolidResult,
  booleanOp,
  computeVolumeMm3,
  exportBoundingBox,
} from "../cad-kernel";

export interface GroupMemberSpec {
  id: string;
  geometry: THREE.BufferGeometry;
  /** 'hole' members are CSG-subtracted from the solid union. Default 'solid'. */
  mode?: "solid" | "hole";
}

export interface GroupResult extends SolidResult {
  /** Input-order ids, preserved so `ungroup` can reconstitute the member list. */
  memberIds: string[];
}

/**
 * Concatenate two geometries as disjoint meshes (no boolean). Used as a
 * fallback when three-bvh-csg is unavailable. Keeps only `position` + index;
 * normals/UVs/colors are dropped and the caller must recompute normals.
 */
function concatDisjoint(
  a: THREE.BufferGeometry,
  b: THREE.BufferGeometry,
): THREE.BufferGeometry {
  // Normalize to same indexed/non-indexed state.
  let aSrc = a;
  let bSrc = b;
  const aIdx = aSrc.getIndex();
  const bIdx = bSrc.getIndex();
  if ((aIdx === null) !== (bIdx === null)) {
    aSrc = aIdx ? aSrc.toNonIndexed() : aSrc;
    bSrc = bIdx ? bSrc.toNonIndexed() : bSrc;
  }

  const aPos = aSrc.getAttribute("position") as THREE.BufferAttribute;
  const bPos = bSrc.getAttribute("position") as THREE.BufferAttribute;
  const aArr = aPos.array as Float32Array;
  const bArr = bPos.array as Float32Array;

  const merged = new THREE.BufferGeometry();
  const combined = new Float32Array(aArr.length + bArr.length);
  combined.set(aArr, 0);
  combined.set(bArr, aArr.length);
  merged.setAttribute("position", new THREE.BufferAttribute(combined, 3));

  const aIdx2 = aSrc.getIndex();
  const bIdx2 = bSrc.getIndex();
  if (aIdx2 && bIdx2) {
    const offset = aPos.count;
    const aIdxArr = aIdx2.array;
    const bIdxArr = bIdx2.array;
    const total = aIdxArr.length + bIdxArr.length;
    const totalVerts = aPos.count + bPos.count;
    const useU32 = totalVerts > 65535;
    const out = useU32 ? new Uint32Array(total) : new Uint16Array(total);
    for (let i = 0; i < aIdxArr.length; i += 1) out[i] = aIdxArr[i];
    for (let i = 0; i < bIdxArr.length; i += 1) {
      out[aIdxArr.length + i] = bIdxArr[i] + offset;
    }
    merged.setIndex(new THREE.BufferAttribute(out, 1));
  }
  return merged;
}

/**
 * Detect whether three-bvh-csg is installed and working. We infer this by
 * checking whether `booleanOp` actually performed a union: when the lib is
 * missing, booleanOp warns and returns a clone of `a` unchanged, so the
 * output vertex count matches `a`'s vertex count regardless of `b`.
 *
 * We avoid calling `require("three-bvh-csg")` here so this module remains
 * fully decoupled from the kernel's loader state (and testable without
 * mocking the require cache).
 */
function csgAvailable(): boolean {
  const a = new THREE.BoxGeometry(1, 1, 1);
  const b = new THREE.BoxGeometry(1, 1, 1);
  b.translate(0.5, 0, 0);
  const aCount = (a.getAttribute("position") as THREE.BufferAttribute).count;
  const out = booleanOp(a, b, "union").mesh;
  const outCount = (out.getAttribute("position") as THREE.BufferAttribute).count;
  // If csg ran, the union mesh has a different vertex count than `a` alone
  // (three-bvh-csg retriangulates intersecting faces). If csg is missing,
  // booleanOp returned `a.clone()` and counts match exactly.
  return outCount !== aCount;
}

/**
 * Merge N geometries into a single SolidResult.
 *
 * @param members Ordered list of group members. Must be non-empty.
 * @returns GroupResult with merged mesh, bbox, volumeMm3, and memberIds.
 *
 * @throws If `members` is empty.
 *
 * @example
 *   const box = new THREE.BoxGeometry(10, 10, 10);
 *   const box2 = new THREE.BoxGeometry(10, 10, 10);
 *   box2.translate(5, 0, 0);
 *   const g = group([
 *     { id: "a", geometry: box },
 *     { id: "b", geometry: box2 },
 *   ]);
 */
export function group(members: readonly GroupMemberSpec[]): GroupResult {
  if (!members || members.length === 0) {
    throw new Error("group: members must be a non-empty array");
  }

  const solids = members.filter((m) => (m.mode ?? "solid") === "solid");
  const holes = members.filter((m) => m.mode === "hole");

  if (solids.length === 0) {
    throw new Error("group: at least one 'solid' member is required");
  }

  // Probe CSG availability once — concatDisjoint fallback applies to BOTH
  // the union path and the hole-subtraction path.
  const hasCsg = csgAvailable();
  if (!hasCsg) {
    // eslint-disable-next-line no-console
    console.warn(
      "[opencad:group] three-bvh-csg missing — merging as disjoint meshes; holes will be skipped",
    );
  }

  /* ------------------------------------------------- accumulate solids */
  let acc: THREE.BufferGeometry = solids[0].geometry.clone();
  for (let i = 1; i < solids.length; i += 1) {
    const next = solids[i].geometry;
    if (hasCsg) {
      acc = booleanOp(acc, next, "union").mesh;
    } else {
      acc = concatDisjoint(acc, next);
    }
  }

  /* ------------------------------------------------- subtract holes */
  if (hasCsg) {
    for (const h of holes) {
      acc = booleanOp(acc, h.geometry, "subtract").mesh;
    }
  } else if (holes.length > 0) {
    // eslint-disable-next-line no-console
    console.warn(
      `[opencad:group] skipping ${holes.length} hole member(s) — three-bvh-csg unavailable`,
    );
  }

  acc.computeVertexNormals();

  return {
    mesh: acc,
    bbox: exportBoundingBox(acc),
    volumeMm3: computeVolumeMm3(acc),
    memberIds: members.map((m) => m.id),
  };
}

/**
 * Ungroup — pure metadata helper.
 *
 * Returns the member ids in the order they were grouped. This is only a
 * metadata split: the actual member geometries cannot be reconstituted from
 * the baked merged mesh (that would require BREP history). Callers are
 * expected to keep the original feature-tree entries alive and use the
 * returned ids to re-activate them.
 */
export function ungroup(g: GroupResult): string[] {
  if (!g || !Array.isArray(g.memberIds)) {
    throw new Error("ungroup: input must be a GroupResult with memberIds");
  }
  return g.memberIds.slice();
}
