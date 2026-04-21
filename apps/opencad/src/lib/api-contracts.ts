/**
 * opencad — API route contracts (Zod)
 *
 * Canonical source-of-truth for request/response shapes. Imported by both:
 *   - opencad server route handlers (validate incoming, type responses)
 *   - hub opencad-client.ts (type-safe fetchers, shared error shape)
 *
 * Conventions (match openslicer/openaccounting):
 *   - runtime="nodejs", dynamic="force-dynamic" on all routes.
 *   - Errors are { error: string, details?: unknown } with HTTP 4xx/5xx.
 *   - Auth: "session" = NextAuth (FinderAuth OIDC / 3DreamzAuth).
 *           "api-key" = X-API-Key header (OPENSOFTWARE_API_KEY).
 *           "public" = no auth (health, manifest).
 *   - Streaming uploads MUST set `duplex: "half"` on fetch (Node 20+ web-streams).
 */
import { z } from "zod";

/* -------------------------------------------------------------------- shared */

export const ErrorResponse = z.object({
  error: z.string(),
  details: z.unknown().optional(),
});
export type ErrorResponse = z.infer<typeof ErrorResponse>;

export const IdParam = z.object({ id: z.string().min(1) });
export const Vec3 = z.object({ x: z.number(), y: z.number(), z: z.number() });
export const BBox = z.object({ min: Vec3, max: Vec3 });

export const ExportFormat = z.enum(["step", "stl", "3mf", "gltf"]);
export const ImportFormat = z.enum(["step", "stl", "3mf", "gltf", "iges", "obj"]);
export const ApiKeyHeader = z.object({ "x-api-key": z.string().min(16).optional() });

/* =========================================================== M1 — CAD CORE */

/* GET /api/health — public */
export const HealthResponse = z.object({
  ok: z.literal(true),
  service: z.literal("opencad"),
  version: z.string(),
  uptimeSec: z.number().int().nonnegative(),
});

/* GET /api/appstore/manifest — public (AppStore protocol) */
export const AppStoreManifestResponse = z.object({
  service: z.literal("opencad"),
  version: z.string(),
  sidebar: z.array(z.object({ label: z.string(), href: z.string(), icon: z.string(), permission: z.string().optional() })),
  dashboards: z.array(z.object({
    id: z.string(), route: z.string(), mode: z.enum(["iframe", "local"]),
    remoteUrl: z.string().optional(), title: z.string().optional(),
  })),
  widgets: z.array(z.any()),
  injections: z.array(z.any()),
});

/* GET /api/projects — session — list user's projects */
export const ListProjectsQuery = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(50),
  cursor: z.string().optional(),
  search: z.string().max(200).optional(),
});
export const ProjectSummary = z.object({
  id: z.string(), name: z.string(), ownerId: z.string(),
  createdAt: z.string(), updatedAt: z.string(),
  thumbnailUrl: z.string().nullable(),
  currentVersionId: z.string().nullable(),
  featureCount: z.number().int().nonnegative(),
});
export const ListProjectsResponse = z.object({ items: z.array(ProjectSummary), nextCursor: z.string().nullable() });

/* POST /api/projects — session — create */
export const CreateProjectBody = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  template: z.enum(["blank", "sketch2d", "part", "assembly"]).default("blank"),
  units: z.enum(["mm", "cm", "m", "in"]).default("mm"),
});
export const CreateProjectResponse = ProjectSummary;

/* GET /api/projects/[id] — session */
export const ProjectDetail = ProjectSummary.extend({
  description: z.string().nullable(),
  units: z.enum(["mm", "cm", "m", "in"]),
  featureTreeRootId: z.string(),
  bbox: BBox.nullable(),
});
export const GetProjectResponse = ProjectDetail;

/* PATCH /api/projects/[id] — session */
export const PatchProjectBody = CreateProjectBody.partial();
export const PatchProjectResponse = ProjectDetail;

/* DELETE /api/projects/[id] — session */
export const DeleteProjectResponse = z.object({ ok: z.literal(true), id: z.string() });

/* GET /api/projects/[id]/versions — session */
export const VersionSummary = z.object({
  id: z.string(), projectId: z.string(), label: z.string(),
  createdAt: z.string(), createdBy: z.string(),
  parentVersionId: z.string().nullable(),
  featureTreeHash: z.string(),
  sizeBytes: z.number().int().nonnegative(),
});
export const ListVersionsResponse = z.object({ items: z.array(VersionSummary) });

/* POST /api/projects/[id]/versions — session — snapshot current tree */
export const CreateVersionBody = z.object({
  label: z.string().min(1).max(120),
  message: z.string().max(2000).optional(),
});
export const CreateVersionResponse = VersionSummary;

/* GET /api/projects/[id]/export/[format] — session — STREAMING response
 * Response: application/octet-stream (or model/step+zip, model/gltf-binary).
 * Headers: Content-Disposition: attachment; filename="<project>-<version>.<ext>"
 *          X-Export-Format: step|stl|3mf|gltf
 *          X-Triangle-Count / X-Volume-Cm3 (STL/3MF only)
 * Streaming: ReadableStream — client consumes via response.body. No Zod body. */
export const ExportParams = z.object({ id: z.string(), format: ExportFormat });
export const ExportQuery = z.object({
  versionId: z.string().optional(),                   // default = current
  tessellation: z.enum(["coarse", "normal", "fine"]).default("normal"),
  binary: z.coerce.boolean().default(true),           // STL/3MF binary vs ASCII
});

/* POST /api/import/[format] — session — multipart STREAMING upload
 *
 * CRITICAL pass-through contract (documented per task):
 *   Client fetch() MUST set { body: readableStream, duplex: "half" }.
 *   Node 20+ web-streams reject duplex uploads unless "half" is declared.
 *   The server pipes request.body → opencad-core parser WITHOUT buffering,
 *   same as openslicer's model-upload path. Do not call request.arrayBuffer()
 *   or request.formData() in the handler — they defeat streaming and OOM on
 *   large STEP files (see .claude/rules/known-pitfalls.md → "Upload Proxy OOM").
 *
 * Content-Type: multipart/form-data (field "file") OR application/octet-stream.
 * Max size: 500 MB (MAX_UPLOAD_BYTES env, 413 on overrun).
 */
export const ImportParams = z.object({ format: ImportFormat });
export const ImportResponse = z.object({
  projectId: z.string(),
  importedFeatureId: z.string(),
  bbox: BBox,
  triangleCount: z.number().int().nonnegative().optional(),
  warnings: z.array(z.string()),
});

/* POST /api/sketch/solve — session — stateless 2D constraint solver */
export const SketchEntity = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("point"), id: z.string(), x: z.number(), y: z.number(), fixed: z.boolean().default(false) }),
  z.object({ kind: z.literal("line"), id: z.string(), p0: z.string(), p1: z.string() }),
  z.object({ kind: z.literal("arc"), id: z.string(), center: z.string(), start: z.string(), end: z.string() }),
  z.object({ kind: z.literal("circle"), id: z.string(), center: z.string(), radius: z.number().positive() }),
  z.object({
    kind: z.literal("ellipse"),
    id: z.string(),
    center: z.string(),
    semiMajor: z.number().positive(),
    semiMinor: z.number().positive(),
    rotationDeg: z.number().default(0),
  }),
  z.object({
    kind: z.literal("bezier-cubic"),
    id: z.string(),
    p0: z.string(), p1: z.string(), p2: z.string(), p3: z.string(),
  }),
  z.object({
    kind: z.literal("bspline"),
    id: z.string(),
    degree: z.number().int().min(1).max(7).default(3),
    controlPoints: z.array(z.string()).min(2),
  }),
]);
export const SketchConstraint = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("coincident"), a: z.string(), b: z.string() }),
  z.object({ kind: z.literal("horizontal"), entity: z.string() }),
  z.object({ kind: z.literal("vertical"),   entity: z.string() }),
  z.object({ kind: z.literal("parallel"),   a: z.string(), b: z.string() }),
  z.object({ kind: z.literal("perpendicular"), a: z.string(), b: z.string() }),
  z.object({ kind: z.literal("distance"), a: z.string(), b: z.string(), value: z.number().positive() }),
  z.object({ kind: z.literal("angle"),    a: z.string(), b: z.string(), degrees: z.number() }),
  z.object({ kind: z.literal("radius"), entity: z.string(), value: z.number().positive() }),
  z.object({ kind: z.literal("equal"),  a: z.string(), b: z.string() }),
]);
export const SketchSolveBody = z.object({
  entities: z.array(SketchEntity).max(5000),
  constraints: z.array(SketchConstraint).max(5000),
  tolerance: z.number().positive().default(1e-6),
  maxIterations: z.number().int().positive().max(5000).default(200),
});
export const SketchSolveResponse = z.object({
  status: z.enum(["solved", "under-constrained", "over-constrained", "failed"]),
  entities: z.array(z.object({ id: z.string(), x: z.number().optional(), y: z.number().optional(), radius: z.number().optional() })),
  dof: z.number().int(),                                // +N = N remaining DOF; -N = N redundant
  residual: z.number(),
  iterations: z.number().int().nonnegative(),
  conflicts: z.array(z.object({ constraintId: z.string(), reason: z.string() })).optional(),
});

/* POST /api/feature/evaluate — session — stateful re-eval of a project's tree */
export const FeatureEvaluateBody = z.object({
  projectId: z.string(),
  fromFeatureId: z.string().optional(),                 // partial re-eval from node
  parameterOverrides: z.record(z.string(), z.union([z.number(), z.string(), z.boolean()])).optional(),
  dryRun: z.boolean().default(false),
});
export const FeatureEvaluateResponse = z.object({
  projectId: z.string(),
  evaluatedFeatureIds: z.array(z.string()),
  bbox: BBox.nullable(),
  triangleCount: z.number().int().nonnegative(),
  durationMs: z.number().nonnegative(),
  errors: z.array(z.object({ featureId: z.string(), message: z.string() })),
});

/* POST /api/handoff/openslicer — session — send tessellated mesh to openslicer
 * Server-side: tessellate current project → POST multipart STL to
 * `${OPENSLICER_URL}/api/models/upload` with X-API-Key (OPENSOFTWARE_API_KEY). */
export const HandoffOpenslicerBody = z.object({
  projectId: z.string(),
  versionId: z.string().optional(),
  tessellation: z.enum(["coarse", "normal", "fine"]).default("normal"),
  openslicerBaseUrl: z.string().url().optional(),       // default from env
});
export const HandoffOpenslicerResponse = z.object({
  openslicerModelId: z.string(),
  openslicerUrl: z.string().url(),                      // deep-link to /slice?modelId=...
  triangleCount: z.number().int().nonnegative(),
  sizeBytes: z.number().int().nonnegative(),
});

/* ================================================= M2 — ASSEMBLIES (stubs) */

export const AssemblySummary = z.object({ id: z.string(), name: z.string(), projectId: z.string(), partCount: z.number().int() });
export const ListAssembliesResponse = z.object({ items: z.array(AssemblySummary) });
export const CreateAssemblyBody = z.object({ projectId: z.string(), name: z.string().min(1) });
export const CreateAssemblyResponse = AssemblySummary;
export const AssemblySolveBody = z.object({
  assemblyId: z.string(),
  mates: z.array(z.object({ id: z.string(), kind: z.enum(["fix", "coincident", "concentric", "parallel", "distance", "angle"]), a: z.string(), b: z.string(), value: z.number().optional() })),
  parts: z.array(z.object({ id: z.string(), fixed: z.boolean().default(false) })),
});
export const AssemblySolveResponse = z.object({
  status: z.enum(["solved", "under-constrained", "over-constrained", "failed"]),
  transforms: z.array(z.object({ partId: z.string(), matrix: z.array(z.number()).length(16) })),
  dof: z.number().int(),
});
export const AssemblyExportParams = z.object({ id: z.string(), format: ExportFormat });
// Response: same streaming contract as project export.

/* ========================================================= M3 — CAM (stubs) */

export const CamOperation = z.object({
  id: z.string(), kind: z.enum(["face", "contour", "pocket", "drill", "adaptive", "3d-parallel"]),
  toolId: z.string(), feedMmMin: z.number().positive(), spindleRpm: z.number().positive(),
  stepoverMm: z.number().positive().optional(), stepdownMm: z.number().positive().optional(),
});
export const CamOperationsListResponse = z.object({ items: z.array(CamOperation) });
export const CamOperationsCreateBody = z.object({ projectId: z.string(), operation: CamOperation.omit({ id: true }) });
export const CamOperationsCreateResponse = CamOperation;

export const Tool = z.object({
  id: z.string(), name: z.string(), kind: z.enum(["flat", "ball", "bull", "drill", "chamfer", "vbit"]),
  diameterMm: z.number().positive(), fluteCount: z.number().int().positive(),
  lengthMm: z.number().positive(), material: z.string(),
});
export const ToolListResponse = z.object({ items: z.array(Tool) });
export const ToolCreateBody = Tool.omit({ id: true });
export const ToolCreateResponse = Tool;
export const ToolPatchBody = ToolCreateBody.partial();

export const PostProcessor = z.object({ id: z.string(), name: z.string(), dialect: z.enum(["grbl", "fanuc", "linuxcnc", "marlin", "haas", "mach3"]), templateGcode: z.string() });
export const PostListResponse = z.object({ items: z.array(PostProcessor) });
export const PostCreateBody = PostProcessor.omit({ id: true });
export const PostCreateResponse = PostProcessor;
export const PostPatchBody = PostCreateBody.partial();

export const CamPostprocessBody = z.object({
  projectId: z.string(),
  operationIds: z.array(z.string()).min(1),
  postId: z.string(),
  stockBbox: BBox,
});
export const CamPostprocessResponse = z.object({
  gcodeId: z.string(),
  lineCount: z.number().int().nonnegative(),
  estimatedDurationSec: z.number().nonnegative(),
  bbox: BBox,
  warnings: z.array(z.string()),
});

/* ================================================================ registry */

/**
 * Route registry — single source-of-truth for clients and route wiring.
 * Auth: "session" | "api-key" | "public".
 */
export const routes = {
  "GET /api/health":                                  { auth: "public",  res: HealthResponse },
  "GET /api/appstore/manifest":                       { auth: "public",  res: AppStoreManifestResponse },
  "GET /api/projects":                                { auth: "session", query: ListProjectsQuery, res: ListProjectsResponse },
  "POST /api/projects":                               { auth: "session", body: CreateProjectBody,  res: CreateProjectResponse },
  "GET /api/projects/[id]":                           { auth: "session", params: IdParam,          res: GetProjectResponse },
  "PATCH /api/projects/[id]":                         { auth: "session", params: IdParam, body: PatchProjectBody, res: PatchProjectResponse },
  "DELETE /api/projects/[id]":                        { auth: "session", params: IdParam,          res: DeleteProjectResponse },
  "GET /api/projects/[id]/versions":                  { auth: "session", params: IdParam,          res: ListVersionsResponse },
  "POST /api/projects/[id]/versions":                 { auth: "session", params: IdParam, body: CreateVersionBody, res: CreateVersionResponse },
  "GET /api/projects/[id]/export/[format]":           { auth: "session", params: ExportParams, query: ExportQuery, res: "stream" as const },
  "POST /api/import/[format]":                        { auth: "session", params: ImportParams, res: ImportResponse, streaming: "duplex:half" as const },
  "POST /api/sketch/solve":                           { auth: "session", body: SketchSolveBody,    res: SketchSolveResponse },
  "POST /api/feature/evaluate":                       { auth: "session", body: FeatureEvaluateBody, res: FeatureEvaluateResponse },
  "POST /api/handoff/openslicer":                     { auth: "session", body: HandoffOpenslicerBody, res: HandoffOpenslicerResponse },
  // M2
  "GET /api/assemblies":                              { auth: "session", res: ListAssembliesResponse },
  "POST /api/assemblies":                             { auth: "session", body: CreateAssemblyBody, res: CreateAssemblyResponse },
  "POST /api/assembly/solve":                         { auth: "session", body: AssemblySolveBody,  res: AssemblySolveResponse },
  "GET /api/assemblies/[id]/export/[format]":         { auth: "session", params: AssemblyExportParams, res: "stream" as const },
  // M3
  "GET /api/cam/operations":                          { auth: "session", res: CamOperationsListResponse },
  "POST /api/cam/operations":                         { auth: "session", body: CamOperationsCreateBody, res: CamOperationsCreateResponse },
  "GET /api/cam/tools":                               { auth: "session", res: ToolListResponse },
  "POST /api/cam/tools":                              { auth: "session", body: ToolCreateBody,     res: ToolCreateResponse },
  "PATCH /api/cam/tools/[id]":                        { auth: "session", params: IdParam, body: ToolPatchBody, res: Tool },
  "DELETE /api/cam/tools/[id]":                       { auth: "session", params: IdParam, res: z.object({ ok: z.literal(true) }) },
  "GET /api/cam/posts":                               { auth: "session", res: PostListResponse },
  "POST /api/cam/posts":                              { auth: "session", body: PostCreateBody,     res: PostCreateResponse },
  "PATCH /api/cam/posts/[id]":                        { auth: "session", params: IdParam, body: PostPatchBody, res: PostProcessor },
  "DELETE /api/cam/posts/[id]":                       { auth: "session", params: IdParam, res: z.object({ ok: z.literal(true) }) },
  "POST /api/cam/postprocess":                        { auth: "session", body: CamPostprocessBody, res: CamPostprocessResponse },
} as const;

export type RouteKey = keyof typeof routes;
