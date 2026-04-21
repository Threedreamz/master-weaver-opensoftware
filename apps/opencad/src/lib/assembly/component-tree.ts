/**
 * Assembly component tree for opencad.
 *
 * Pure, deterministic data model for assemblies built from Parts (geometry
 * references) placed via Instances (named transforms, optionally nested).
 *
 * NOTE on rotation composition: for simplicity and determinism we compose
 * nested rotations by per-axis summation (Euler XYZ, degrees). This is NOT
 * mathematically correct for non-commutative rotations; for exact motion
 * stacks, swap the implementation for 4x4 matrix multiplication or quaternion
 * composition. The current form is sufficient for BOM/tree-traversal tests
 * and for a first-pass visualization.
 */

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface Part {
  id: string;
  name: string;
  geometryRef: string;
  metadata?: Record<string, string>;
}

export interface Instance {
  id: string;
  name: string;
  partId: string;
  parentId: string | null;
  translation: Vec3;
  rotationDeg: Vec3;
}

export interface AssemblyTree {
  parts: Part[];
  instances: Instance[];
}

export interface FlatPlacement {
  instanceId: string;
  partId: string;
  depth: number;
  worldTranslation: Vec3;
  worldRotationDeg: Vec3;
}

export interface BomEntry {
  partId: string;
  partName: string;
  count: number;
  depth: number;
}

const ZERO: Vec3 = Object.freeze({ x: 0, y: 0, z: 0 }) as Vec3;

function addVec(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
}

/**
 * Validate that:
 *   - every instance.partId references a part in parts[]
 *   - every non-null parentId references an existing instance
 *   - the parent chain is acyclic (no instance is its own ancestor)
 *   - instance ids are unique
 *   - part ids are unique
 */
export function validateTree(tree: AssemblyTree): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  const partIds = new Set<string>();
  for (const p of tree.parts) {
    if (partIds.has(p.id)) {
      errors.push(`Duplicate part id: ${p.id}`);
    }
    partIds.add(p.id);
  }

  const instanceIds = new Set<string>();
  for (const ins of tree.instances) {
    if (instanceIds.has(ins.id)) {
      errors.push(`Duplicate instance id: ${ins.id}`);
    }
    instanceIds.add(ins.id);
  }

  const instancesById = new Map<string, Instance>();
  for (const ins of tree.instances) {
    instancesById.set(ins.id, ins);
  }

  for (const ins of tree.instances) {
    if (!partIds.has(ins.partId)) {
      errors.push(`Instance ${ins.id} references missing part ${ins.partId}`);
    }
    if (ins.parentId !== null && !instancesById.has(ins.parentId)) {
      errors.push(`Instance ${ins.id} references missing parent ${ins.parentId}`);
    }
  }

  // Cycle detection: walk parent chain for each instance, detect repeats.
  for (const ins of tree.instances) {
    const visited = new Set<string>();
    let cursor: Instance | undefined = ins;
    while (cursor && cursor.parentId !== null) {
      if (visited.has(cursor.id)) {
        errors.push(`Cycle detected in parent chain starting at instance ${ins.id}`);
        break;
      }
      visited.add(cursor.id);
      const next = instancesById.get(cursor.parentId);
      if (!next) break; // already reported as missing-parent
      if (next.id === ins.id) {
        errors.push(`Cycle detected in parent chain starting at instance ${ins.id}`);
        break;
      }
      cursor = next;
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Flatten the tree, depth-first from roots, composing world transforms by
 * (simplified) Euler summation for rotation and vector add for translation.
 * Invalid trees throw — validate first if you care.
 */
export function flattenTree(tree: AssemblyTree): FlatPlacement[] {
  const instancesById = new Map<string, Instance>();
  for (const ins of tree.instances) instancesById.set(ins.id, ins);

  const childrenByParent = new Map<string | null, Instance[]>();
  for (const ins of tree.instances) {
    const key = ins.parentId;
    const bucket = childrenByParent.get(key);
    if (bucket) bucket.push(ins);
    else childrenByParent.set(key, [ins]);
  }

  const out: FlatPlacement[] = [];

  function walk(
    ins: Instance,
    depth: number,
    parentTranslation: Vec3,
    parentRotation: Vec3,
    visited: Set<string>,
  ): void {
    if (visited.has(ins.id)) return; // cycle guard
    visited.add(ins.id);

    const worldTranslation = addVec(parentTranslation, ins.translation);
    const worldRotationDeg = addVec(parentRotation, ins.rotationDeg);

    out.push({
      instanceId: ins.id,
      partId: ins.partId,
      depth,
      worldTranslation,
      worldRotationDeg,
    });

    const children = childrenByParent.get(ins.id) ?? [];
    for (const child of children) {
      walk(child, depth + 1, worldTranslation, worldRotationDeg, visited);
    }

    visited.delete(ins.id);
  }

  const roots = childrenByParent.get(null) ?? [];
  for (const root of roots) {
    walk(root, 0, ZERO, ZERO, new Set<string>());
  }

  return out;
}

/**
 * Build a bill-of-materials (BOM) entry per unique Part referenced in any
 * Instance. `count` is the total number of instances referencing the part;
 * `depth` is the max depth at which any such instance appears. Sorted by
 * count descending, then partId ascending for determinism.
 */
export function flattenBOM(tree: AssemblyTree): BomEntry[] {
  const placements = flattenTree(tree);
  const partsById = new Map<string, Part>();
  for (const p of tree.parts) partsById.set(p.id, p);

  const agg = new Map<string, { count: number; maxDepth: number }>();
  for (const pl of placements) {
    const prev = agg.get(pl.partId);
    if (prev) {
      prev.count += 1;
      if (pl.depth > prev.maxDepth) prev.maxDepth = pl.depth;
    } else {
      agg.set(pl.partId, { count: 1, maxDepth: pl.depth });
    }
  }

  const rows: BomEntry[] = [];
  for (const [partId, v] of agg) {
    const part = partsById.get(partId);
    rows.push({
      partId,
      partName: part ? part.name : partId,
      count: v.count,
      depth: v.maxDepth,
    });
  }

  rows.sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count;
    return a.partId < b.partId ? -1 : a.partId > b.partId ? 1 : 0;
  });

  return rows;
}

/** Immutably append an instance. Does not validate — call validateTree after. */
export function addInstance(tree: AssemblyTree, ins: Instance): AssemblyTree {
  return {
    parts: tree.parts.slice(),
    instances: tree.instances.concat([ins]),
  };
}

/**
 * Immutably remove an instance AND all its transitive children. Returns a new
 * tree. Parts are never removed by this operation (a Part may be referenced
 * elsewhere; GC parts separately if desired).
 */
export function removeInstance(tree: AssemblyTree, instanceId: string): AssemblyTree {
  const childrenByParent = new Map<string | null, Instance[]>();
  for (const ins of tree.instances) {
    const key = ins.parentId;
    const bucket = childrenByParent.get(key);
    if (bucket) bucket.push(ins);
    else childrenByParent.set(key, [ins]);
  }

  const toRemove = new Set<string>();
  const stack: string[] = [instanceId];
  while (stack.length > 0) {
    const id = stack.pop()!;
    if (toRemove.has(id)) continue;
    toRemove.add(id);
    const kids = childrenByParent.get(id) ?? [];
    for (const kid of kids) stack.push(kid.id);
  }

  return {
    parts: tree.parts.slice(),
    instances: tree.instances.filter((i) => !toRemove.has(i.id)),
  };
}
