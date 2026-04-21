/**
 * opencam — API route contracts (Zod)
 *
 * Canonical source-of-truth for request/response shapes. Imported by both:
 *   - opencam server route handlers (validate incoming, type responses)
 *   - hub opencam-client.ts (type-safe fetchers, shared error shape)
 *
 * Conventions (match opencad/openslicer/openaccounting):
 *   - runtime="nodejs", dynamic="force-dynamic" on all routes.
 *   - Errors are { error: string, details?: unknown } with HTTP 4xx/5xx.
 *   - Auth: "session" = NextAuth (FinderAuth OIDC / 3DreamzAuth).
 *           "api-key" = X-API-Key header (OPENSOFTWARE_API_KEY).
 *           "public" = no auth (health, manifest).
 *   - Streaming uploads MUST set `duplex: "half"` on fetch (Node 20+ web-streams).
 */
import { z } from "zod";

/* -------------------------------------------------------------------- shared
 * Shared primitives mirrored from apps/opencad/src/lib/api-contracts.ts — keep in sync.
 */

export const ErrorResponse = z.object({
  error: z.string(),
  details: z.unknown().optional(),
});
export type ErrorResponse = z.infer<typeof ErrorResponse>;

export const IdParam = z.object({ id: z.string().min(1) });
export const Vec3 = z.object({ x: z.number(), y: z.number(), z: z.number() });
export const BBox = z.object({ min: Vec3, max: Vec3 });

export const ApiKeyHeader = z.object({ "x-api-key": z.string().min(16).optional() });

/* =========================================================== M1 — CAM CORE */

/* GET /api/health — public */
export const HealthResponse = z.object({
  status: z.literal("ok"),
  app: z.literal("opencam"),
  timestamp: z.string(),
});

/* GET /api/appstore/manifest — public (AppStore protocol) */
export const AppStoreManifestResponse = z.object({
  service: z.literal("opencam"),
  version: z.string(),
  sidebar: z.array(z.object({
    label: z.string(), href: z.string(), icon: z.string(), permission: z.string().optional(),
  })),
  dashboards: z.array(z.object({
    id: z.string(), route: z.string(), mode: z.enum(["iframe", "local"]),
    remoteUrl: z.string().optional(), title: z.string().optional(),
  })),
  widgets: z.array(z.any()),
  injections: z.array(z.any()),
});

/* -------------------------------------------------------------------- projects */

export const ProjectSummary = z.object({
  id: z.string(),
  name: z.string(),
  userId: z.string(),
  stockBbox: BBox.nullable().optional(),
  linkedOpencadProjectId: z.string().nullable().optional(),
  linkedOpencadVersionId: z.string().nullable().optional(),
  operationCount: z.number().int().nonnegative(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export const ProjectDetail = ProjectSummary.extend({
  description: z.string().nullable().optional(),
  material: z.string().nullable().optional(),
});

export const CreateProjectBody = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  stockBbox: BBox.optional(),
  material: z.string().max(120).optional(),
});
export const PatchProjectBody = CreateProjectBody.partial();

export const ListProjectsQuery = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(50),
  cursor: z.string().optional(),
  search: z.string().max(200).optional(),
});
export const ListProjectsResponse = z.object({
  items: z.array(ProjectSummary),
  nextCursor: z.string().nullable(),
});

/* -------------------------------------------------------------------- tools */

export const Tool = z.object({
  id: z.string(),
  name: z.string().min(1).max(200),
  kind: z.enum(["flat", "ball", "bull", "drill", "chamfer", "vbit", "tap"]),
  diameterMm: z.number().positive(),
  fluteCount: z.number().int().positive(),
  lengthMm: z.number().positive(),
  material: z.string().max(120).optional(),
  shopId: z.string().optional(),
});
export const ToolCreateBody = Tool.omit({ id: true });
export const ToolPatchBody = ToolCreateBody.partial();
export const ToolListResponse = z.object({ items: z.array(Tool) });

/* -------------------------------------------------------------------- operations */

export const CamOperationKind = z.enum([
  "face",
  "contour",
  "pocket",
  "drill",
  "adaptive",
  "3d-parallel",
]);

export const CamOperation = z.object({
  id: z.string(),
  projectId: z.string(),
  kind: CamOperationKind,
  toolId: z.string(),
  feedMmMin: z.number().positive(),
  spindleRpm: z.number().positive(),
  stepoverMm: z.number().positive().optional(),
  stepdownMm: z.number().positive().optional(),
  paramsJson: z.record(z.string(), z.unknown()),
  sortOrder: z.number().int().nonnegative(),
});

export const CreateOperationBody = z.object({
  projectId: z.string().min(1),
  operation: CamOperation.omit({ id: true, projectId: true, sortOrder: true }),
});
export const PatchOperationBody = CamOperation.pick({
  kind: true,
  toolId: true,
  feedMmMin: true,
  spindleRpm: true,
  stepoverMm: true,
  stepdownMm: true,
  paramsJson: true,
}).partial();
export const OperationListResponse = z.object({ items: z.array(CamOperation) });

/* -------------------------------------------------------------------- toolpaths */

/** Polyline in world coordinates (mm). */
export const Polyline3 = z.array(Vec3);

export const ToolpathResult = z.object({
  operationId: z.string(),
  polylines: z.array(Polyline3),
  estimatedDurationSec: z.number().nonnegative(),
  bbox: BBox,
});
export const GenerateToolpathResponse = ToolpathResult;

/* -------------------------------------------------------------------- post processors */

export const PostProcessor = z.object({
  id: z.string(),
  name: z.string().min(1).max(200),
  dialect: z.enum(["grbl", "marlin", "fanuc", "linuxcnc", "haas", "mach3"]),
  templateGcode: z.string(),
  builtIn: z.boolean(),
});
export const PostCreateBody = PostProcessor.omit({ id: true, builtIn: true }).extend({
  builtIn: z.boolean().default(false),
});
export const PostPatchBody = PostCreateBody.partial();
export const PostListResponse = z.object({ items: z.array(PostProcessor) });

/* -------------------------------------------------------------------- postprocess + simulate */

export const PostprocessBody = z.object({
  projectId: z.string().min(1),
  operationIds: z.array(z.string()).min(1),
  postId: z.string().min(1),
});
export const PostprocessResponse = z.object({
  gcodeId: z.string(),
  lineCount: z.number().int().nonnegative(),
  estimatedDurationSec: z.number().nonnegative(),
  bbox: BBox,
  warnings: z.array(z.string()),
});

export const SimulateBody = z.object({
  projectId: z.string().min(1),
  operationIds: z.array(z.string()).min(1),
  quality: z.enum(["coarse", "normal", "fine"]).default("normal"),
});
export const SimulateResponse = z.object({
  frames: z.number(),
  finalBbox: BBox,
  removedVolumeMm3: z.number().nonnegative(),
  warnings: z.array(z.string()),
});

/* -------------------------------------------------------------------- stock */

export const StockSetup = z.object({
  bbox: BBox,
  material: z.string().max(120).optional(),
});

/* -------------------------------------------------------------------- opencad import */

/**
 * POST /api/opencad/import — pull STEP/STL from opencad into an opencam project.
 *
 * CRITICAL: server uses fetch() against opencad's /api/projects/[id]/export/[format]
 * with streaming — callers MUST NOT buffer the response. The fetch site in
 * opencad-proxy.ts passes the ReadableStream straight through. Requires
 * duplex:"half" on the outbound fetch when re-streaming. See
 * .claude/rules/known-pitfalls.md → "Upload Proxy OOM".
 */
export const ImportFromOpencadBody = z.object({
  openCadProjectId: z.string().min(1),
  versionId: z.string().optional(),
  role: z.enum(["stock", "part"]).default("part"),
  format: z.enum(["step", "stl"]).default("stl"),
});
export const ImportFromOpencadResponse = z.object({
  projectId: z.string(),
  role: z.enum(["stock", "part"]),
  bbox: BBox,
  triangleCount: z.number().optional(),
  partGeometryHash: z.string(),
  importedHoles: z
    .array(
      z.object({
        x: z.number(),
        y: z.number(),
        z: z.number(),
        diameterMm: z.number().positive(),
        depthMm: z.number().positive(),
      }),
    )
    .optional(),
});

/* ================================================================ registry */

/**
 * Route registry — single source-of-truth for clients and route wiring.
 * Auth: "session" | "api-key" | "public".
 */
export const routes = {
  "GET /api/health":                        { auth: "public", res: HealthResponse },
  "GET /api/appstore/manifest":             { auth: "public", res: AppStoreManifestResponse },
  "GET /api/projects":                      { auth: "session", query: ListProjectsQuery, res: ListProjectsResponse },
  "POST /api/projects":                     { auth: "session", body: CreateProjectBody, res: ProjectSummary },
  "GET /api/projects/[id]":                 { auth: "session", params: IdParam, res: ProjectDetail },
  "PATCH /api/projects/[id]":               { auth: "session", params: IdParam, body: PatchProjectBody, res: ProjectDetail },
  "DELETE /api/projects/[id]":              { auth: "session", params: IdParam, res: z.object({ ok: z.literal(true), id: z.string() }) },
  "GET /api/operations":                    { auth: "session", res: OperationListResponse },
  "POST /api/operations":                   { auth: "session", body: CreateOperationBody, res: CamOperation },
  "PATCH /api/operations/[id]":             { auth: "session", params: IdParam, body: PatchOperationBody, res: CamOperation },
  "DELETE /api/operations/[id]":            { auth: "session", params: IdParam, res: z.object({ ok: z.literal(true) }) },
  "POST /api/operations/[id]/generate":     { auth: "session", params: IdParam, res: GenerateToolpathResponse },
  "GET /api/tools":                         { auth: "session", res: ToolListResponse },
  "POST /api/tools":                        { auth: "session", body: ToolCreateBody, res: Tool },
  "PATCH /api/tools/[id]":                  { auth: "session", params: IdParam, body: ToolPatchBody, res: Tool },
  "DELETE /api/tools/[id]":                 { auth: "session", params: IdParam, res: z.object({ ok: z.literal(true) }) },
  "GET /api/posts":                         { auth: "session", res: PostListResponse },
  "POST /api/posts":                        { auth: "session", body: PostCreateBody, res: PostProcessor },
  "PATCH /api/posts/[id]":                  { auth: "session", params: IdParam, body: PostPatchBody, res: PostProcessor },
  "DELETE /api/posts/[id]":                 { auth: "session", params: IdParam, res: z.object({ ok: z.literal(true) }) },
  "POST /api/postprocess":                  { auth: "session", body: PostprocessBody, res: PostprocessResponse },
  "POST /api/simulate":                     { auth: "session", body: SimulateBody, res: SimulateResponse },
  "POST /api/opencad/import":               { auth: "api-key", body: ImportFromOpencadBody, res: ImportFromOpencadResponse, streaming: "duplex:half" as const },
} as const;
export type RouteKey = keyof typeof routes;
