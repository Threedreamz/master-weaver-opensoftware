export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/assembly/bom
 *
 * Stateless BOM flattener. Takes an AssemblyTree (parts + nested instances),
 * validates structural integrity, then returns:
 *   - `valid` / `errors` from validateTree
 *   - the flattened BOM (per-part counts + max depth)
 *   - the flat placement list (world transforms per instance)
 *
 * Stateless: the client owns the tree document and passes it in whole.
 * We never persist here — persistence happens via the document save path.
 *
 * Auth: session. 401 if missing.
 * If validation fails we still return 200 with `valid: false` and an empty
 * bom/placements — the client renders the error list. Only malformed input
 * (zod failure) or internal errors return non-2xx.
 */

import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { resolveUser } from "@/lib/internal-user";
import {
  flattenBOM,
  flattenTree,
  validateTree,
  type AssemblyTree,
} from "@/lib/assembly/component-tree";

const Vec3Schema = z.object({
  x: z.number(),
  y: z.number(),
  z: z.number(),
});

const PartSchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  geometryRef: z.string(),
  metadata: z.record(z.string(), z.string()).optional(),
});

const InstanceSchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  partId: z.string().min(1),
  parentId: z.string().nullable(),
  translation: Vec3Schema,
  rotationDeg: Vec3Schema,
});

const AssemblyTreeBody = z.object({
  parts: z.array(PartSchema),
  instances: z.array(InstanceSchema),
});

export async function POST(req: NextRequest) {
  const u = await resolveUser(req);
  if (u instanceof NextResponse) return u;

  const json = await req.json().catch(() => null);
  const parsed = AssemblyTreeBody.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_body", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const tree: AssemblyTree = parsed.data;

  try {
    const { valid, errors } = validateTree(tree);
    if (!valid) {
      return NextResponse.json(
        {
          valid: false,
          errors,
          bom: [],
          placements: [],
        },
        { status: 200 },
      );
    }

    const placements = flattenTree(tree);
    const bom = flattenBOM(tree);

    return NextResponse.json(
      {
        valid: true,
        errors: [],
        bom,
        placements,
      },
      { status: 200 },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    // eslint-disable-next-line no-console
    console.error("[opencad] assembly bom failed:", msg);
    return NextResponse.json({ error: "internal", details: msg }, { status: 500 });
  }
}
