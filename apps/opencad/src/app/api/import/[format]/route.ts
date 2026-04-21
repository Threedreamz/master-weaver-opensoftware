export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * POST /api/import/[format]
 *
 * Accepts the uploaded CAD file in either `application/octet-stream` (preferred
 * for large files — streams straight through without buffering) or
 * `multipart/form-data` (with a `file` field and optional `projectId` field).
 *
 * `projectId` is required; it may be provided as a URL query param OR as a
 * multipart form field. See `@/lib/importers/import-handler` for the full
 * protocol and the rationale behind the two body modes.
 */

import { type NextRequest } from "next/server";
import { handleImport } from "@/lib/importers/import-handler";

type RouteCtx = { params: Promise<{ format: string }> };

export async function POST(req: NextRequest, ctx: RouteCtx) {
  const { format } = await ctx.params;
  return handleImport(req, format, null);
}
