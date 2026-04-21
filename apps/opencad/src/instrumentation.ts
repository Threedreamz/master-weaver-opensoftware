/**
 * Next.js instrumentation hook — runs ONCE per server process at boot,
 * BEFORE any route handler is invoked.
 *
 * MUST live at src/instrumentation.ts (not app-root) because opencad uses
 * the src/ layout — Next.js only picks up the file from one place depending
 * on that. See Grand-Master-Weaver/.claude/rules/known-pitfalls.md →
 * "Next.js instrumentation.ts location with src/ layout".
 *
 * Idempotent: migrate() is a no-op once __drizzle_migrations is up-to-date.
 * Safe to run on every container start.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  // Polyfill browser-only FileReader for three.js GLTFExporter. The exporter
  // creates a Blob then calls `new FileReader().readAsArrayBuffer(blob)` /
  // `readAsDataURL(blob)` to unwrap it. Node 22 has Blob global but no
  // FileReader, so glTF export throws `FileReader is not defined` mid-parse.
  // Shim it with Blob.arrayBuffer()/Buffer base64 — no extra deps.
  if (typeof (globalThis as { FileReader?: unknown }).FileReader === "undefined") {
    class FileReaderShim {
      onload: ((ev: { target: FileReaderShim }) => void) | null = null;
      onloadend: ((ev: { target: FileReaderShim }) => void) | null = null;
      onerror: ((ev: unknown) => void) | null = null;
      result: ArrayBuffer | string | null = null;
      readyState = 0;
      readAsArrayBuffer(blob: Blob) {
        blob.arrayBuffer().then(
          (ab) => {
            this.result = ab;
            this.readyState = 2;
            this.onload?.({ target: this });
            this.onloadend?.({ target: this });
          },
          (err) => {
            this.readyState = 2;
            this.onerror?.(err);
            this.onloadend?.({ target: this });
          },
        );
      }
      readAsDataURL(blob: Blob) {
        blob.arrayBuffer().then(
          (ab) => {
            const b64 = Buffer.from(ab).toString("base64");
            this.result = `data:${blob.type || "application/octet-stream"};base64,${b64}`;
            this.readyState = 2;
            this.onload?.({ target: this });
            this.onloadend?.({ target: this });
          },
          (err) => {
            this.readyState = 2;
            this.onerror?.(err);
            this.onloadend?.({ target: this });
          },
        );
      }
    }
    (globalThis as { FileReader?: unknown }).FileReader = FileReaderShim;
    console.log("[opencad:boot] installed FileReader polyfill for GLTFExporter");
  }

  const { mkdirSync, existsSync } = await import("fs");
  const { dirname, resolve } = await import("path");
  const { migrate } = await import("drizzle-orm/better-sqlite3/migrator");

  const dbPath = (process.env.DATABASE_URL || "./data/opencad.db").replace(/^file:/, "");
  const dataDir = dirname(dbPath);

  try {
    if (!existsSync(dataDir)) {
      mkdirSync(dataDir, { recursive: true });
      console.log(`[opencad:boot] created data dir ${dataDir}`);
    }

    const { db } = await import("./db/index");

    // Next 16 standalone cwd = /app (monorepo root), NOT the app dir — so a
    // bare `drizzle/migrations` relative path would resolve to
    // `/app/drizzle/migrations` which does not exist. The Dockerfile bakes
    // migrations at `/app/apps/opencad/drizzle/migrations`; read the explicit
    // OPENCAD_MIGRATIONS_DIR env var in prod, fall back to cwd-relative in dev.
    const migrationsFolder = process.env.OPENCAD_MIGRATIONS_DIR
      ? resolve(process.env.OPENCAD_MIGRATIONS_DIR)
      : process.env.NODE_ENV === "production"
        ? "/app/apps/opencad/drizzle/migrations"
        : resolve(process.cwd(), "drizzle/migrations");
    console.log(`[opencad:boot] running migrations from ${migrationsFolder}`);

    // Drizzle tracks applied migrations in __drizzle_migrations and skips
    // anything already journaled. If a CREATE TABLE / column actually fails,
    // that's a real inconsistency — let it surface instead of swallowing it
    // as "already applied" (which silently leaves later migrations unrun).
    migrate(db as never, { migrationsFolder });
    console.log(`[opencad:boot] migrations complete`);
  } catch (err) {
    console.error(`[opencad:boot] FATAL — db init failed:`, err);
    throw err;
  }
}
