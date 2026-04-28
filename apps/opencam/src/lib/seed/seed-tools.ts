/**
 * Idempotent seeder for the default tool library.
 *
 * Runs at instrumentation-boot AFTER migrations + post-processor seeding.
 * Inserts a realistic default tool library on first boot only — guarded by a
 * `count(*) === 0` check on the opencamTools table, so user-modified or
 * user-added tools on subsequent boots are never clobbered.
 *
 * Stable IDs (`tool-builtin-<slug>`) mean toolpath operations created against
 * a default tool keep their FK after restarts, and a future re-seed (if the
 * table is ever wiped) restores the same primary keys.
 *
 * The schema-level user_id column is NOT NULL on opencam_tools, so built-in
 * tools live under the synthetic owner `"__builtin__"`. The admin UI filters
 * this owner into the "Built-in tools" section.
 *
 * Feeds/speeds intentionally NOT stored on the tool row — schema keeps
 * those on opencamOperations (per-op tunable). The library here exists so
 * users can pick a real tool dimension/kind in the toolpath wizard without
 * first hand-rolling a tool record.
 */

import { count } from "drizzle-orm";
import { db, schema } from "@/db";

const BUILTIN_USER_ID = "__builtin__";

interface ToolSeed {
  id: string;
  name: string;
  kind: "flat" | "ball" | "bull" | "drill" | "chamfer" | "vbit" | "tap";
  diameterMm: number;
  fluteCount: number;
  /** Overall tool length (shank + flute), mm — used for stickout / collision checks. */
  lengthMm: number;
  /** "HSS" | "Carbide" | "Cobalt" — informational only, drives feeds/speeds suggestions later. */
  material: string;
}

/**
 * Reference: realistic feeds/speeds for 6061 aluminum on a hobby-class
 * spindle (e.g. Makita RT0701C @ 16k, or 24k VFD trim spindle). Values are
 * conservative and meant to land first chips reliably; pros will tune.
 *
 * Endmills <=4mm: 2 flute (chip clearance dominates over MRR).
 * Endmills >=6mm: 3 flute (more MRR, still good chip evac for alu).
 * Drills: 2 flute HSS jobber-length, generic.
 * Ball endmills: 2 flute (finishing passes).
 * V-bit: 60deg single flute, 3.175mm shank — common engraver/chamfer.
 */
const BUILTIN_TOOLS: ToolSeed[] = [
  // Flat endmills (carbide, square nose)
  { id: "tool-builtin-em-flat-1mm",  name: "Endmill flat 1mm (2F carbide)",  kind: "flat", diameterMm: 1,  fluteCount: 2, lengthMm: 38, material: "Carbide" },
  { id: "tool-builtin-em-flat-2mm",  name: "Endmill flat 2mm (2F carbide)",  kind: "flat", diameterMm: 2,  fluteCount: 2, lengthMm: 38, material: "Carbide" },
  { id: "tool-builtin-em-flat-3mm",  name: "Endmill flat 3mm (2F carbide)",  kind: "flat", diameterMm: 3,  fluteCount: 2, lengthMm: 38, material: "Carbide" },
  { id: "tool-builtin-em-flat-4mm",  name: "Endmill flat 4mm (2F carbide)",  kind: "flat", diameterMm: 4,  fluteCount: 2, lengthMm: 50, material: "Carbide" },
  { id: "tool-builtin-em-flat-6mm",  name: "Endmill flat 6mm (3F carbide)",  kind: "flat", diameterMm: 6,  fluteCount: 3, lengthMm: 50, material: "Carbide" },
  { id: "tool-builtin-em-flat-8mm",  name: "Endmill flat 8mm (3F carbide)",  kind: "flat", diameterMm: 8,  fluteCount: 3, lengthMm: 63, material: "Carbide" },
  { id: "tool-builtin-em-flat-10mm", name: "Endmill flat 10mm (3F carbide)", kind: "flat", diameterMm: 10, fluteCount: 3, lengthMm: 72, material: "Carbide" },
  { id: "tool-builtin-em-flat-12mm", name: "Endmill flat 12mm (3F carbide)", kind: "flat", diameterMm: 12, fluteCount: 3, lengthMm: 75, material: "Carbide" },

  // Drills (HSS jobber)
  { id: "tool-builtin-drill-1mm",  name: "Drill HSS 1mm (jobber)",  kind: "drill", diameterMm: 1,  fluteCount: 2, lengthMm: 34, material: "HSS" },
  { id: "tool-builtin-drill-3mm",  name: "Drill HSS 3mm (jobber)",  kind: "drill", diameterMm: 3,  fluteCount: 2, lengthMm: 61, material: "HSS" },
  { id: "tool-builtin-drill-6mm",  name: "Drill HSS 6mm (jobber)",  kind: "drill", diameterMm: 6,  fluteCount: 2, lengthMm: 93, material: "HSS" },
  { id: "tool-builtin-drill-10mm", name: "Drill HSS 10mm (jobber)", kind: "drill", diameterMm: 10, fluteCount: 2, lengthMm: 133, material: "HSS" },

  // Ball endmills (carbide, finishing)
  { id: "tool-builtin-em-ball-3mm", name: "Endmill ball 3mm (2F carbide)", kind: "ball", diameterMm: 3, fluteCount: 2, lengthMm: 38, material: "Carbide" },
  { id: "tool-builtin-em-ball-6mm", name: "Endmill ball 6mm (2F carbide)", kind: "ball", diameterMm: 6, fluteCount: 2, lengthMm: 50, material: "Carbide" },

  // Specialty
  { id: "tool-builtin-vbit-60deg",  name: "V-bit 60deg (1F, 3.175mm shank)", kind: "vbit",    diameterMm: 3.175, fluteCount: 1, lengthMm: 38, material: "Carbide" },
];

export async function seedToolLibrary(): Promise<{ inserted: number; skipped: boolean }> {
  // Idempotency guard: only seed when the tool table is genuinely empty. A
  // user who deletes all built-in tools on purpose should not have them
  // resurrected on every restart.
  const [{ c }] = await db
    .select({ c: count() })
    .from(schema.opencamTools);

  if (c > 0) {
    return { inserted: 0, skipped: true };
  }

  const rows = BUILTIN_TOOLS.map((t) => ({
    id: t.id,
    userId: BUILTIN_USER_ID,
    name: t.name,
    kind: t.kind,
    diameterMm: t.diameterMm,
    fluteCount: t.fluteCount,
    lengthMm: t.lengthMm,
    material: t.material,
    shopId: null,
  }));

  // Single insert — better-sqlite3 batches into one statement, all-or-nothing
  // under WAL. If a future migration adds non-null columns without defaults,
  // this throws and instrumentation logs the error (non-fatal at boot per
  // the existing seedBuiltinPosts wrapper pattern).
  await db.insert(schema.opencamTools).values(rows);

  return { inserted: rows.length, skipped: false };
}
