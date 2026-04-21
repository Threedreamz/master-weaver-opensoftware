export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * POST /api/projects/[id]/import/[format]
 *
 * REST-style import endpoint — same behavior as `/api/import/[format]` but
 * reads `projectId` from the route path instead of query / form field. Exists
 * so hub proxies that rewrite `/api/cad/projects/{id}/import/stl` have a
 * direct target (prior to this, the path 404'd and the hub surfaced a generic
 * 500 to the user).
 *
 * Body modes: `application/octet-stream` (raw bytes) OR `multipart/form-data`
 * with a `file` field. See `@/lib/importers/import-handler`.
 */

import { type NextRequest } from "next/server";
import { handleImport } from "@/lib/importers/import-handler";

type RouteCtx = { params: Promise<{ id: string; format: string }> };

export async function POST(req: NextRequest, ctx: RouteCtx) {
  const { id, format } = await ctx.params;
  return handleImport(req, format, id);
}
