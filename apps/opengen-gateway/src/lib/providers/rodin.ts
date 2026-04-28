import type { ProviderAdapter, GenerationInput, SubmitResult, PollResult } from "./types";

/**
 * Rodin (Hyper3D) — text-to-3d and image-to-3d via multipart/form-data submit.
 *
 * Submit returns both `uuid` (task id, used for download) and a
 * `subscription_key` (used for status polling). We pack both into the
 * providerJobId as `<uuid>::<subscription_key>` so poll can extract them.
 *
 * Docs: https://developer.hyper3d.ai/api-specification/overview
 */

const API_BASE = "https://api.hyper3d.com/api/v2";

interface RodinSubmitResponse {
  error?: string | null;
  message?: string;
  uuid?: string;
  jobs?: { uuids?: string[]; subscription_key?: string };
}

interface RodinStatusResponse {
  jobs?: Array<{ uuid?: string; status?: string }>;
  error?: string;
  message?: string;
}

interface RodinDownloadResponse {
  list?: Array<{ name?: string; url?: string }>;
  error?: string;
  message?: string;
}

function authHeader(): string {
  const token = process.env.RODIN_API_KEY;
  if (!token) throw new Error("Rodin: missing RODIN_API_KEY");
  return `Bearer ${token}`;
}

function normaliseString(p: Record<string, unknown>, key: string): string {
  const v = p[key];
  if (typeof v === "string" && v.length > 0) return v;
  throw new Error(`Rodin: inputPayload.${key} is required`);
}

function packJobId(uuid: string, subscriptionKey: string): string {
  return `${uuid}::${subscriptionKey}`;
}

function unpackJobId(providerJobId: string): { uuid: string; subscriptionKey: string } {
  const idx = providerJobId.indexOf("::");
  if (idx < 0) {
    throw new Error(`Rodin: malformed providerJobId (expected uuid::subscription_key)`);
  }
  return {
    uuid: providerJobId.slice(0, idx),
    subscriptionKey: providerJobId.slice(idx + 2),
  };
}

export const rodinProvider: ProviderAdapter = {
  id: "rodin",
  displayName: "Rodin (Hyper3D)",
  isEnabled(): boolean {
    return !!process.env.RODIN_API_KEY;
  },
  async submit(input: GenerationInput): Promise<SubmitResult> {
    const form = new FormData();
    const tier = (input.inputPayload["tier"] as string) || "Regular";
    form.append("tier", tier);
    form.append("geometry_file_format", "glb");
    form.append("material", "PBR");
    form.append("quality", "medium");

    if (input.inputType === "image") {
      const imageUrl = normaliseString(input.inputPayload, "imageUrl");
      const imgResp = await fetch(imageUrl);
      if (!imgResp.ok) {
        throw new Error(`Rodin: failed to fetch image ${imageUrl} (HTTP ${imgResp.status})`);
      }
      const buf = await imgResp.arrayBuffer();
      const blob = new Blob([buf], { type: imgResp.headers.get("content-type") || "image/jpeg" });
      form.append("images", blob, "input.jpg");
      const optionalPrompt = input.inputPayload["prompt"];
      if (typeof optionalPrompt === "string" && optionalPrompt.length > 0) {
        form.append("prompt", optionalPrompt);
      }
    } else {
      const prompt = normaliseString(input.inputPayload, "prompt");
      form.append("prompt", prompt);
    }

    const resp = await fetch(`${API_BASE}/rodin`, {
      method: "POST",
      headers: { Authorization: authHeader() },
      body: form,
    });
    if (!resp.ok) {
      const text = await resp.text().catch(() => "");
      throw new Error(`Rodin submit failed (HTTP ${resp.status}): ${text.slice(0, 300)}`);
    }
    const data = (await resp.json()) as RodinSubmitResponse;
    if (data.error) {
      throw new Error(`Rodin submit error: ${data.error} ${data.message ?? ""}`);
    }
    const uuid = data.uuid;
    const subscriptionKey = data.jobs?.subscription_key;
    if (!uuid || !subscriptionKey) {
      throw new Error("Rodin submit: missing uuid or subscription_key in response");
    }
    return { providerJobId: packJobId(uuid, subscriptionKey) };
  },
  async poll(providerJobId: string): Promise<PollResult> {
    const { uuid, subscriptionKey } = unpackJobId(providerJobId);

    const statusResp = await fetch(`${API_BASE}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: authHeader() },
      body: JSON.stringify({ subscription_key: subscriptionKey }),
    });
    if (!statusResp.ok) {
      const text = await statusResp.text().catch(() => "");
      return {
        status: "failed",
        errorMessage: `Rodin status failed (HTTP ${statusResp.status}): ${text.slice(0, 300)}`,
      };
    }
    const status = (await statusResp.json()) as RodinStatusResponse;
    const jobs = status.jobs ?? [];
    if (jobs.length === 0) {
      return { status: "running" };
    }
    if (jobs.some((j) => (j.status ?? "").toLowerCase() === "failed")) {
      return {
        status: "failed",
        errorMessage: status.message || status.error || "rodin task failed",
      };
    }
    if (!jobs.every((j) => j.status === "Done")) {
      return { status: "running" };
    }

    const dlResp = await fetch(`${API_BASE}/download`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: authHeader() },
      body: JSON.stringify({ task_uuid: uuid }),
    });
    if (!dlResp.ok) {
      const text = await dlResp.text().catch(() => "");
      return {
        status: "failed",
        errorMessage: `Rodin download failed (HTTP ${dlResp.status}): ${text.slice(0, 300)}`,
      };
    }
    const dl = (await dlResp.json()) as RodinDownloadResponse;
    const glb = dl.list?.find((f) => (f.name ?? "").toLowerCase().endsWith(".glb"));
    if (!glb?.url) {
      return { status: "failed", errorMessage: "Rodin done but no .glb in download list" };
    }
    return { status: "succeeded", glbUrl: glb.url };
  },
};
