import { NextResponse, type NextRequest } from "next/server";
import { bakeUrdfToGlb } from "@/lib/urdf-bake";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const ALLOWED_URDF_HOSTS = new Set([
  "raw.githubusercontent.com",
  "media.githubusercontent.com",
  "github.com",
  "gitlab.com",
  "bitbucket.org",
  "codeberg.org",
  "build.openflexure.org",
]);

function isAllowedUrdfUrl(u: string): boolean {
  try {
    const url = new URL(u);
    if (url.protocol !== "https:" && url.protocol !== "http:") return false;
    return ALLOWED_URDF_HOSTS.has(url.hostname);
  } catch {
    return false;
  }
}

function parsePackageBases(raw: string | null): Record<string, string> {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return {};
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(parsed)) {
      if (typeof v === "string" && /^https?:\/\//.test(v)) out[k] = v;
    }
    return out;
  } catch {
    return {};
  }
}

async function handle(urdfUrl: string, packageBasesRaw: string | null) {
  if (!isAllowedUrdfUrl(urdfUrl)) {
    return NextResponse.json({ error: "urdf url not allowed" }, { status: 400 });
  }
  const packageBases = parsePackageBases(packageBasesRaw);
  try {
    const { glb, report } = await bakeUrdfToGlb({ urdfUrl, packageBases });
    return new NextResponse(new Uint8Array(glb), {
      status: 200,
      headers: {
        "content-type": "model/gltf-binary",
        "content-length": String(glb.byteLength),
        "cache-control": "public, max-age=86400, s-maxage=604800",
        "x-bake-robot": report.robotName,
        "x-bake-links": String(report.linkCount),
        "x-bake-visuals": String(report.visualCount),
        "x-bake-meshes": String(report.meshesBaked),
        "x-bake-skipped": String(report.meshesSkipped.length),
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: "bake failed", detail: msg }, { status: 502 });
  }
}

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");
  const pkg = req.nextUrl.searchParams.get("packageBases");
  if (!url) return NextResponse.json({ error: "missing ?url" }, { status: 400 });
  return handle(url, pkg);
}

export async function POST(req: NextRequest) {
  let body: { url?: string; packageBases?: Record<string, string> } = {};
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }
  if (!body.url) return NextResponse.json({ error: "missing url" }, { status: 400 });
  const pkg = body.packageBases ? JSON.stringify(body.packageBases) : null;
  return handle(body.url, pkg);
}
