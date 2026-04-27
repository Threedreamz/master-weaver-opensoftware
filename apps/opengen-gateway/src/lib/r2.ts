import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

/**
 * R2 helpers — uses AWS SDK v3 with R2's S3-compatible endpoint.
 *
 * CRITICAL: opengen-gateway MUST use presigned PUT for outputs. A server-side
 * proxy that does `await req.arrayBuffer()` + `Buffer.from(arrayBuffer)`
 * doubles the file in RAM and OOM-kills the Next process on large GLBs,
 * surfacing as Railway 502. See known-pitfalls 2026-04-20
 * "Upload Proxy OOM (Railway 502)".
 *
 * Token scope: R2 tokens are bucket-scoped, NOT account-scoped, even when
 * R2_ACCOUNT_ID is the same. Verify with packages/storage/scripts/smoke-put.mjs
 * before going live. See known-pitfalls 2026-04-20 "Cloudflare R2 token scope".
 */

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`R2: missing env var ${name}`);
  return v;
}

let _client: S3Client | null = null;
function client(): S3Client {
  if (_client) return _client;
  _client = new S3Client({
    region: "auto",
    endpoint: requireEnv("R2_ENDPOINT"),
    credentials: {
      accessKeyId: requireEnv("R2_ACCESS_KEY_ID"),
      secretAccessKey: requireEnv("R2_SECRET_ACCESS_KEY"),
    },
  });
  return _client;
}

export async function presignedPutUrl(
  key: string,
  contentType: string,
  ttlSec = 600,
): Promise<string> {
  const cmd = new PutObjectCommand({
    Bucket: requireEnv("R2_BUCKET"),
    Key: key,
    ContentType: contentType,
  });
  return getSignedUrl(client(), cmd, { expiresIn: ttlSec });
}

export function publicUrl(key: string): string {
  const base = requireEnv("R2_PUBLIC_BASE_URL").replace(/\/+$/, "");
  return `${base}/${key}`;
}

export function isR2Configured(): boolean {
  return (
    !!process.env.R2_ENDPOINT &&
    !!process.env.R2_ACCESS_KEY_ID &&
    !!process.env.R2_SECRET_ACCESS_KEY &&
    !!process.env.R2_BUCKET &&
    !!process.env.R2_PUBLIC_BASE_URL
  );
}
