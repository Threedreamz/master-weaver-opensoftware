/**
 * opencad — feature-dag utilities
 *
 * Small, dependency-free graph helpers over the feature timeline.
 * Pure Node (no browser imports). Consumed by feature-timeline.ts.
 */

import type { OpencadFeature } from "@opensoftware/db/opencad";

export type DAGNode = {
  feature: OpencadFeature;
  parents: string[];   // parent feature IDs (from feature.parentIds)
  children: string[];  // reverse-indexed from parents
};

export type DAG = Map<string, DAGNode>;

/**
 * Build the bidirectional DAG keyed by feature ID.
 * Unknown parent refs are silently ignored (they may live in another project /
 * have been deleted) — topoSort is the place that decides cycle-ness, buildDAG
 * is just an indexer.
 */
export function buildDAG(features: OpencadFeature[]): DAG {
  const dag: DAG = new Map();

  for (const f of features) {
    dag.set(f.id, {
      feature: f,
      parents: Array.isArray(f.parentIds) ? [...f.parentIds] : [],
      children: [],
    });
  }

  // Reverse-index children. Only consider parents that exist in this batch.
  for (const node of dag.values()) {
    for (const parentId of node.parents) {
      const parent = dag.get(parentId);
      if (parent) parent.children.push(node.feature.id);
    }
  }

  return dag;
}

/**
 * Kahn topological sort. Ties are broken by ascending `order` (stable, matches
 * the user-facing timeline). Throws on cycle with the offending IDs listed.
 */
export function topoSort(features: OpencadFeature[]): OpencadFeature[] {
  const dag = buildDAG(features);

  // In-degree = number of parents that exist in the DAG (dangling parents
  // don't count — they can't block anything).
  const inDegree = new Map<string, number>();
  for (const node of dag.values()) {
    let deg = 0;
    for (const p of node.parents) if (dag.has(p)) deg++;
    inDegree.set(node.feature.id, deg);
  }

  const ready: OpencadFeature[] = [];
  for (const [id, deg] of inDegree) {
    if (deg === 0) ready.push(dag.get(id)!.feature);
  }
  ready.sort((a, b) => a.order - b.order);

  const sorted: OpencadFeature[] = [];
  while (ready.length > 0) {
    const next = ready.shift()!;
    sorted.push(next);
    const node = dag.get(next.id)!;
    for (const childId of node.children) {
      const d = (inDegree.get(childId) ?? 0) - 1;
      inDegree.set(childId, d);
      if (d === 0) {
        // Insert child preserving `order` ordering of the ready queue.
        const child = dag.get(childId)!.feature;
        let i = 0;
        while (i < ready.length && ready[i].order <= child.order) i++;
        ready.splice(i, 0, child);
      }
    }
  }

  if (sorted.length !== features.length) {
    const remaining = features
      .filter((f) => !sorted.find((s) => s.id === f.id))
      .map((f) => f.id);
    throw new Error(
      `feature-dag: cycle detected in feature tree; unresolved IDs: ${remaining.join(", ")}`,
    );
  }

  return sorted;
}
