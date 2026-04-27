/**
 * opensimulation — API route contracts (Zod)
 *
 * Canonical source-of-truth for request/response shapes. Imported by both:
 *   - opensimulation server route handlers (validate incoming, type responses)
 *   - hub opensimulation-client.ts (type-safe fetchers, shared error shape)
 *
 * Conventions (match opencad/openslicer/openaccounting):
 *   - runtime="nodejs", dynamic="force-dynamic" on all routes.
 *   - Errors are { error: string, details?: unknown } with HTTP 4xx/5xx.
 *   - Auth: "session" = NextAuth (FinderAuth OIDC / 3DreamzAuth).
 *           "api-key" = X-API-Key header (OPENSOFTWARE_API_KEY).
 *           "public" = no auth (health, manifest).
 *           "session-or-api-key" = either accepted (solve/* + import/*).
 */
import { z } from "zod";

/* -------------------------------------------------------------------- shared */

export const ErrorResponse = z.object({
  error: z.string(),
  details: z.unknown().optional(),
});
export type ErrorResponse = z.infer<typeof ErrorResponse>;

export const IdParam = z.object({ id: z.string().min(1) });
export type IdParam = z.infer<typeof IdParam>;

export const Vec3 = z.object({ x: z.number(), y: z.number(), z: z.number() });
export type Vec3 = z.infer<typeof Vec3>;

export const BBox = z.object({ min: Vec3, max: Vec3 });
export type BBox = z.infer<typeof BBox>;

export const ApiKeyHeader = z.object({ "x-api-key": z.string().min(16).optional() });
export type ApiKeyHeader = z.infer<typeof ApiKeyHeader>;

/* =================================================== manifest + health (public) */

/* GET /api/health — public */
export const HealthResponse = z.object({
  ok: z.literal(true),
  service: z.literal("opensimulation"),
  version: z.string(),
  uptimeSec: z.number().int().nonnegative(),
});
export type HealthResponse = z.infer<typeof HealthResponse>;

/* GET /api/appstore/manifest — public (AppStore protocol) */
export const AppStoreManifestResponse = z.object({
  service: z.literal("opensimulation"),
  version: z.string(),
  sidebar: z.array(z.object({ label: z.string(), href: z.string(), icon: z.string(), permission: z.string().optional() })),
  dashboards: z.array(z.object({
    id: z.string(), route: z.string(), mode: z.enum(["iframe", "local"]),
    remoteUrl: z.string().optional(), title: z.string().optional(),
  })),
  widgets: z.array(z.any()),
  injections: z.array(z.any()),
});
export type AppStoreManifestResponse = z.infer<typeof AppStoreManifestResponse>;

/* ============================================================ projects (session) */

/* GET /api/projects — session — list user's projects */
export const ListProjectsQuery = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(50),
  cursor: z.string().optional(),
  search: z.string().max(200).optional(),
});
export type ListProjectsQuery = z.infer<typeof ListProjectsQuery>;

export const ProjectSummary = z.object({
  id: z.string(),
  name: z.string(),
  ownerId: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  description: z.string().nullable().optional(),
  runsCount: z.number().int().nonnegative(),
});
export type ProjectSummary = z.infer<typeof ProjectSummary>;

export const ListProjectsResponse = z.object({ items: z.array(ProjectSummary), nextCursor: z.string().nullable() });
export type ListProjectsResponse = z.infer<typeof ListProjectsResponse>;

/* POST /api/projects — session — create */
export const CreateProjectBody = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
});
export type CreateProjectBody = z.infer<typeof CreateProjectBody>;

export const CreateProjectResponse = ProjectSummary;
export type CreateProjectResponse = z.infer<typeof CreateProjectResponse>;

/* GET /api/projects/[id] — session */
export const GetProjectResponse = ProjectSummary;
export type GetProjectResponse = z.infer<typeof GetProjectResponse>;

/* PATCH /api/projects/[id] — session */
export const PatchProjectBody = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
});
export type PatchProjectBody = z.infer<typeof PatchProjectBody>;

export const PatchProjectResponse = ProjectSummary;
export type PatchProjectResponse = z.infer<typeof PatchProjectResponse>;

/* DELETE /api/projects/[id] — session */
export const DeleteProjectResponse = z.object({ ok: z.literal(true) });
export type DeleteProjectResponse = z.infer<typeof DeleteProjectResponse>;

/* ================================================================ runs (session) */

/* GET /api/projects/[id]/runs — session */
export const ListRunsQuery = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(50),
  cursor: z.string().optional(),
  domain: z.string().optional(),
});
export type ListRunsQuery = z.infer<typeof ListRunsQuery>;

export const RunSummary = z.object({
  id: z.string(),
  projectId: z.string(),
  domain: z.enum(["kinematic-fwd", "kinematic-ik", "fea-static", "thermal-steady", "cleaning"]),
  status: z.enum(["pending", "running", "done", "failed"]),
  triggeredBy: z.enum(["session", "api-key", "odyn-device", "opencad", "opencam"]),
  durationMs: z.number().int().nonnegative().nullable(),
  createdAt: z.string(),
});
export type RunSummary = z.infer<typeof RunSummary>;

export const ListRunsResponse = z.object({ items: z.array(RunSummary), nextCursor: z.string().nullable() });
export type ListRunsResponse = z.infer<typeof ListRunsResponse>;

/* GET /api/runs/[id] — session */
export const RunDetail = RunSummary.extend({
  inputJson: z.unknown(),
  resultJson: z.unknown().nullable(),
});
export type RunDetail = z.infer<typeof RunDetail>;

/* ========================================================= materials (session + api-key) */

export const MaterialSummary = z.object({
  id: z.string(),
  userId: z.string(),
  name: z.string(),
  density: z.number(),
  youngModulus: z.number(),
  poisson: z.number(),
  thermalConductivity: z.number(),
  specificHeat: z.number(),
  yieldStrength: z.number(),
  createdAt: z.string(),
});
export type MaterialSummary = z.infer<typeof MaterialSummary>;

export const ListMaterialsResponse = z.object({ items: z.array(MaterialSummary) });
export type ListMaterialsResponse = z.infer<typeof ListMaterialsResponse>;

export const CreateMaterialBody = z.object({
  name: z.string().min(1).max(200),
  density: z.number().nonnegative(),
  youngModulus: z.number().nonnegative(),
  poisson: z.number().nonnegative(),
  thermalConductivity: z.number().nonnegative(),
  specificHeat: z.number().nonnegative(),
  yieldStrength: z.number().nonnegative(),
});
export type CreateMaterialBody = z.infer<typeof CreateMaterialBody>;

export const CreateMaterialResponse = MaterialSummary;
export type CreateMaterialResponse = z.infer<typeof CreateMaterialResponse>;

/* ============================================ solve — kinematic (session-or-api-key) */

/* POST /api/solve/kinematic — session-or-api-key */
export const SolveKinematicBody = z.discriminatedUnion("mode", [
  z.object({
    mode: z.literal("fwd"),
    joints: z.array(z.object({
      name: z.string(),
      axis: z.enum(["x", "y", "z"]),
      angle: z.number(),
      offset: Vec3,
    })),
    root: z.object({ position: Vec3 }).optional(),
  }),
  z.object({
    mode: z.literal("ik"),
    chain: z.array(z.object({
      alpha: z.number(),
      a: z.number(),
      d: z.number(),
      theta: z.number(),
    })),
    target: z.object({ position: Vec3 }),
    lambda: z.number().default(0.1),
    maxIter: z.number().int().default(100),
  }),
]);
export type SolveKinematicBody = z.infer<typeof SolveKinematicBody>;

export const SolveKinematicResponse = z.discriminatedUnion("mode", [
  z.object({
    mode: z.literal("fwd"),
    transforms: z.array(z.object({
      name: z.string(),
      position: Vec3,
      rotation: z.array(z.array(z.number())),
    })),
    endEffector: z.object({ position: Vec3 }),
  }),
  z.object({
    mode: z.literal("ik"),
    success: z.boolean(),
    iterations: z.number().int(),
    jointAngles: z.array(z.number()),
    finalError: z.number(),
    endEffector: z.object({ position: Vec3 }),
  }),
]);
export type SolveKinematicResponse = z.infer<typeof SolveKinematicResponse>;

/* ================================================ solve — FEA static (session-or-api-key) */

/* POST /api/solve/fea-static — session-or-api-key */
export const SolveFeaStaticBody = z.object({
  meshId: z.string().optional(),
  mesh: z.object({
    vertices: z.array(z.number()),
    tets: z.array(z.number()),
  }).optional(),
  material: z.object({
    youngModulus: z.number(),
    poisson: z.number(),
    density: z.number().optional(),
  }),
  boundaryConditions: z.array(z.object({
    kind: z.enum(["fix", "load"]),
    nodeIds: z.array(z.number()),
    magnitude: Vec3.optional(),
  })),
}).refine((v) => Boolean(v.meshId) !== Boolean(v.mesh), {
  message: "Provide exactly one of: meshId or mesh",
});
export type SolveFeaStaticBody = z.infer<typeof SolveFeaStaticBody>;

export const SolveFeaStaticResponse = z.object({
  displacements: z.array(z.number()),
  vonMises: z.array(z.number()),
  maxDisplacementMm: z.number(),
  maxStressMPa: z.number(),
  runId: z.string(),
});
export type SolveFeaStaticResponse = z.infer<typeof SolveFeaStaticResponse>;

/* ============================================ solve — thermal steady (session-or-api-key) */

/* POST /api/solve/thermal — session-or-api-key */
export const SolveThermalSteadyBody = z.object({
  meshId: z.string().optional(),
  mesh: z.object({
    vertices: z.array(z.number()),
    tets: z.array(z.number()),
  }).optional(),
  material: z.object({
    thermalConductivity: z.number(),
  }),
  boundaryConditions: z.array(z.object({
    kind: z.enum(["temperature", "heat_flux"]),
    nodeIds: z.array(z.number()),
    value: z.number(),
  })),
}).refine((v) => Boolean(v.meshId) !== Boolean(v.mesh), {
  message: "Provide exactly one of: meshId or mesh",
});
export type SolveThermalSteadyBody = z.infer<typeof SolveThermalSteadyBody>;

export const SolveThermalSteadyResponse = z.object({
  temperatures: z.array(z.number()),
  minTempC: z.number(),
  maxTempC: z.number(),
  runId: z.string(),
});
export type SolveThermalSteadyResponse = z.infer<typeof SolveThermalSteadyResponse>;

/* ============================================ integration imports (session-or-api-key) */

/* POST /api/opencad/import — session-or-api-key.
 * `projectId` is the destination opensimulation project; `openCadProjectId` is
 * the upstream opencad project we pull geometry from. Both are required —
 * leaving `projectId` out of the exported schema previously caused hub clients
 * to send malformed bodies and receive 400 INVALID_BODY at runtime. */
export const ImportOpenCadBody = z.object({
  projectId: z.string().min(1),
  openCadProjectId: z.string(),
  versionId: z.string().optional(),
  tessellation: z.enum(["coarse", "normal", "fine"]).default("normal"),
});
export type ImportOpenCadBody = z.infer<typeof ImportOpenCadBody>;

export const ImportOpenCadResponse = z.object({
  meshId: z.string(),
  geometryHash: z.string(),
  vertexCount: z.number(),
  elementCount: z.number(),
});
export type ImportOpenCadResponse = z.infer<typeof ImportOpenCadResponse>;

/* POST /api/opencam/import-toolpath — session-or-api-key (M1 stub: returns 501) */
export const ImportOpenCamToolpathBody = z.object({
  openCamProjectId: z.string(),
  operationIds: z.array(z.string()),
});
export type ImportOpenCamToolpathBody = z.infer<typeof ImportOpenCamToolpathBody>;

export const ImportOpenCamToolpathResponse = z.object({ runId: z.string() });
export type ImportOpenCamToolpathResponse = z.infer<typeof ImportOpenCamToolpathResponse>;

/* POST /api/odyn/import-sequence — session-or-api-key */
export const ImportOdynSequenceBody = z.object({
  odynDeviceId: z.string(),
  sessionId: z.string(),
});
export type ImportOdynSequenceBody = z.infer<typeof ImportOdynSequenceBody>;

export const ImportOdynSequenceResponse = z.object({ runId: z.string() });
export type ImportOdynSequenceResponse = z.infer<typeof ImportOdynSequenceResponse>;

/* ================================================================ route registry */

/**
 * Route registry — single source-of-truth for clients and route wiring.
 * Auth: "session" | "api-key" | "public" | "session-or-api-key".
 */
export const RouteKey = z.enum([
  "GET /api/health",
  "GET /api/appstore/manifest",
  "GET /api/projects",
  "POST /api/projects",
  "GET /api/projects/[id]",
  "PATCH /api/projects/[id]",
  "DELETE /api/projects/[id]",
  "GET /api/projects/[id]/runs",
  "GET /api/runs/[id]",
  "POST /api/solve/kinematic",
  "POST /api/solve/fea-static",
  "POST /api/solve/thermal",
  "GET /api/materials",
  "POST /api/materials",
  "POST /api/opencad/import",
  "POST /api/opencam/import-toolpath",
  "POST /api/odyn/import-sequence",
]);
export type RouteKey = z.infer<typeof RouteKey>;

export const ROUTE_AUTH: Record<z.infer<typeof RouteKey>, "session" | "api-key" | "public" | "session-or-api-key"> = {
  "GET /api/health":                     "public",
  "GET /api/appstore/manifest":          "public",
  "GET /api/projects":                   "session",
  "POST /api/projects":                  "session",
  "GET /api/projects/[id]":              "session",
  "PATCH /api/projects/[id]":            "session",
  "DELETE /api/projects/[id]":           "session",
  "GET /api/projects/[id]/runs":         "session",
  "GET /api/runs/[id]":                  "session",
  "POST /api/solve/kinematic":           "session-or-api-key",
  "POST /api/solve/fea-static":          "session-or-api-key",
  "POST /api/solve/thermal":             "session-or-api-key",
  "GET /api/materials":                  "session",
  "POST /api/materials":                 "session",
  "POST /api/opencad/import":            "session-or-api-key",
  "POST /api/opencam/import-toolpath":   "session-or-api-key",
  "POST /api/odyn/import-sequence":      "session-or-api-key",
};
