/**
 * opencad → openslicer handoff (M1)
 *
 * Flow:
 *   1. Evaluate project feature tree → tessellate → binary STL bytes
 *      (via `exporters/stl.ts::exportProjectSTLBytes`).
 *   2. POST multipart/form-data to `${OPENSLICER_URL}/api/models/upload`
 *      with the STL bytes as field `file`. Upstream openslicer upload route
 *      (see apps/openslicer/src/app/api/models/upload/route.ts) expects a
 *      single `file` field and returns `{ id, filename, fileFormat, ... }`.
 *   3. Build a deep-link `${OPENSLICER_PUBLIC_URL}/slice?modelId=<id>` so the
 *      user can be redirected / opened in a new tab.
 *
 * Env vars:
 *   - OPENSLICER_URL              (required) — server-to-server base URL,
 *                                   e.g. http://openslicer.railway.internal:4176
 *   - OPENSLICER_PUBLIC_URL       (required) — public-facing base URL for
 *                                   the deep-link returned to the user's browser
 *   - OPENSOFTWARE_API_KEY        (required) — x-api-key for the gateway
 *
 * Auth model: matches bubble-conventions.md → OpenSoftware AppStore "auth
 * model (hybrid)" — X-API-Key for server-to-server, OIDC for the user-facing
 * iframe. This handoff is server-to-server so we use x-api-key.
 *
 * Streaming: we use standard FormData (not duplex streaming) because the
 * multipart body must be chunked-encoded with boundary markers — Node's
 * `fetch(body, duplex: "half")` doesn't compose cleanly with multipart. The
 * STL bytes were already produced in memory by the exporter, so this is the
 * same memory profile as the openslicer upload client. If we later switch to
 * presigned-PUT-to-R2 (see known-pitfalls.md → "Upload Proxy OOM"), the
 * duplex-stream pattern would apply there, not here.
 */
import type { z } from "zod";
import type { HandoffOpenslicerResponse as HandoffOpenslicerResponseSchema } from "./api-contracts";
import { exportProjectSTLBytes } from "./exporters/stl";

type HandoffResponse = z.infer<typeof HandoffOpenslicerResponseSchema>;

type Tessellation = "coarse" | "normal" | "fine";

export interface HandoffOptions {
  /** Override `OPENSLICER_URL` for server-to-server upload (e.g. tests). */
  openslicerBaseUrl?: string;
  /** Override `OPENSLICER_PUBLIC_URL` for the deep-link. */
  openslicerPublicUrl?: string;
  /** Override `OPENSOFTWARE_API_KEY`. */
  apiKey?: string;
}

function requiredEnv(name: string, override?: string): string {
  const v = override ?? process.env[name];
  if (!v) {
    throw new Error(`slicer-handoff: ${name} is not set — cannot hand off to openslicer`);
  }
  return v;
}

function stripTrailingSlash(u: string): string {
  return u.replace(/\/+$/, "");
}

/**
 * Hand off the current project state to openslicer and return the model
 * reference + deep-link.
 *
 * @throws if env is missing, export fails, or openslicer returns non-2xx.
 */
export async function handoffToOpenslicer(
  projectId: string,
  versionId: string | undefined,
  tessellation: Tessellation,
  options: HandoffOptions = {},
): Promise<HandoffResponse> {
  const baseUrl = stripTrailingSlash(requiredEnv("OPENSLICER_URL", options.openslicerBaseUrl));
  const publicUrl = stripTrailingSlash(requiredEnv("OPENSLICER_PUBLIC_URL", options.openslicerPublicUrl));
  const apiKey = requiredEnv("OPENSOFTWARE_API_KEY", options.apiKey);

  // Step 1: export the tessellated binary STL.
  const { bytes, triangleCount, sizeBytes } = await exportProjectSTLBytes(projectId, {
    binary: true,
    tessellation,
    versionId,
  });

  // Step 2: build FormData with a single `file` field. Blob-wrapping the
  // Uint8Array lets undici set the correct Content-Type + length headers on
  // the multipart part without us hand-crafting boundaries.
  const filename = `opencad-${projectId}.stl`;
  // Detach from the ArrayBuffer backing store so the Blob owns an
  // independent copy — Node's undici can otherwise hold on to the whole
  // geometry buffer for the life of the request.
  const blob = new Blob([new Uint8Array(bytes)], { type: "application/octet-stream" });
  const form = new FormData();
  form.append("file", blob, filename);

  // Step 3: POST to the openslicer upload endpoint.
  const uploadUrl = `${baseUrl}/api/models/upload`;
  const res = await fetch(uploadUrl, {
    method: "POST",
    headers: {
      // Do NOT set Content-Type manually — letting fetch generate the
      // multipart boundary is the one reliable way to stay compatible with
      // Node's undici + Next.js formData() parser upstream.
      "x-api-key": apiKey,
      accept: "application/json",
    },
    body: form,
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(
      `slicer-handoff: openslicer upload failed ${res.status} ${res.statusText}: ${errText.slice(0, 500)}`,
    );
  }

  // openslicer returns { id, name, filename, fileFormat, fileSizeBytes, ... }
  // (see apps/openslicer/src/app/api/models/upload/route.ts). We pick off the
  // id and ignore the rest — metadata reporting belongs to openslicer, not us.
  const body = (await res.json()) as { id?: string; [k: string]: unknown };
  if (!body || typeof body.id !== "string" || body.id.length === 0) {
    throw new Error("slicer-handoff: openslicer upload returned no model id");
  }

  const openslicerUrl = `${publicUrl}/slice?modelId=${encodeURIComponent(body.id)}`;

  return {
    openslicerModelId: body.id,
    openslicerUrl,
    triangleCount,
    sizeBytes,
  };
}
