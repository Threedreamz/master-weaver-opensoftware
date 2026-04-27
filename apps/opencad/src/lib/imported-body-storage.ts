/**
 * opencad — imported-body geometry storage (M1)
 *
 * Bridges `apps/opencad/src/lib/importers/*` (which produce a
 * `THREE.BufferGeometry` from STL/3MF/STEP bytes) and the feature-timeline
 * evaluator (which needs to load that geometry back when it walks the DAG).
 *
 * Shape on disk: a JSON file under `<dataDir>/opencad-imports/<id>.json`
 * containing the SerializedGeometry shape used by the in-memory geometry-cache,
 * but with regular number[] arrays (Float32Array isn't JSON-serializable
 * without a side channel and we want this to round-trip via fs.readFileSync).
 *
 * `<dataDir>` resolves to the directory containing the SQLite DB file:
 *   - dev:  `<repo>/apps/opencad/data/`
 *   - prod: `/app/data/` (Railway volume mount)
 *
 * Why disk and not the existing geometry-cache: the cache is an in-memory LRU
 * (Map-based, 64 entries / 128MB) — it doesn't survive process restart, and an
 * imported body is the ONLY input to its feature timeline node. Losing it on
 * restart would wipe the user's import. Disk is durable; the LRU still caches
 * the deserialized THREE form on hot paths (keyed by feature contentHash).
 */

import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import * as THREE from "three";

import { serializeGeometry, deserializeGeometry, type SolidResult } from "./cad-kernel";

type StoredGeometry = {
  position: number[];
  normal?: number[];
  index: number[];
  bbox: { min: [number, number, number]; max: [number, number, number] };
  volumeMm3: number;
};

function dataDir(): string {
  const dbPath = (process.env.DATABASE_URL || "./data/opencad.db").replace(/^file:/, "");
  return dirname(dbPath);
}

/** Absolute path to the on-disk geometry file for an imported body. */
function pathForId(importedBodyId: string): string {
  return join(dataDir(), "opencad-imports", `${importedBodyId}.json`);
}

/**
 * Persist a `THREE.BufferGeometry` from an importer to disk.
 *
 * Returns the storageKey we want to record on the `opencadImportedBodies` row
 * — a stable relative path under dataDir, NOT the absolute path (so dev/prod
 * differ in dataDir but the row is portable).
 */
export function writeImportedBody(
  importedBodyId: string,
  geometry: THREE.BufferGeometry,
): { storageKey: string; volumeMm3: number; bytes: number } {
  const serialized = serializeGeometry(geometry);
  const stored: StoredGeometry = {
    position: Array.from(serialized.position),
    normal: serialized.normal ? Array.from(serialized.normal) : undefined,
    index: Array.from(serialized.index),
    bbox: serialized.bbox,
    volumeMm3: serialized.volumeMm3,
  };
  const json = JSON.stringify(stored);
  const filePath = pathForId(importedBodyId);
  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(filePath, json, "utf8");
  return {
    storageKey: `opencad-imports/${importedBodyId}.json`,
    volumeMm3: serialized.volumeMm3,
    bytes: Buffer.byteLength(json, "utf8"),
  };
}

/**
 * Load a previously-imported body back into a SolidResult ready for the
 * feature-timeline evaluator. Throws if the file is missing or malformed
 * (caller catches and converts to a per-feature error).
 */
export function readImportedBody(importedBodyId: string): SolidResult {
  const filePath = pathForId(importedBodyId);
  if (!existsSync(filePath)) {
    throw new Error(`imported-body ${importedBodyId} not found at ${filePath}`);
  }
  const raw = readFileSync(filePath, "utf8");
  let parsed: StoredGeometry;
  try {
    parsed = JSON.parse(raw) as StoredGeometry;
  } catch (err) {
    throw new Error(
      `imported-body ${importedBodyId} JSON parse failed: ${
        err instanceof Error ? err.message : String(err)
      }`,
    );
  }
  const geom = deserializeGeometry({
    position: new Float32Array(parsed.position),
    normal: parsed.normal ? new Float32Array(parsed.normal) : undefined,
    index: new Uint32Array(parsed.index),
  });
  return {
    mesh: geom,
    bbox: {
      min: { x: parsed.bbox.min[0], y: parsed.bbox.min[1], z: parsed.bbox.min[2] },
      max: { x: parsed.bbox.max[0], y: parsed.bbox.max[1], z: parsed.bbox.max[2] },
    },
    volumeMm3: parsed.volumeMm3,
  };
}
