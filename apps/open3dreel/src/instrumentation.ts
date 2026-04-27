export const runtime = "nodejs";

export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.RUN_MIGRATIONS === "false") return;

  const { readdir, readFile, mkdir } = await import(
    /* turbopackIgnore: true */ "node:fs/promises"
  );
  const path = await import(/* turbopackIgnore: true */ "node:path");

  const reelsDir = process.env.REELS_DIR || "./data/reels";
  await mkdir(reelsDir, { recursive: true }).catch(() => {});

  const candidates = [
    path.resolve(process.cwd(), "apps/open3dreel/drizzle"),
    path.resolve(process.cwd(), "drizzle"),
    "/app/apps/open3dreel/drizzle",
  ];

  let migrationsDir: string | null = null;
  for (const c of candidates) {
    try {
      await readdir(c);
      migrationsDir = c;
      break;
    } catch {}
  }

  if (!migrationsDir) {
    console.warn("[open3dreel:migrate] migrations dir not found — skipping");
    return;
  }

  try {
    // Relative path — `@/` alias is bundler-resolved and not always reliable
    // from instrumentation.ts in standalone mode.
    const { sqlite } = await import("./db");

    sqlite.exec(`CREATE TABLE IF NOT EXISTS __applied_migrations (
      filename TEXT PRIMARY KEY,
      applied_at INTEGER NOT NULL DEFAULT (unixepoch())
    )`);

    const files = (await readdir(migrationsDir))
      .filter((f) => f.endsWith(".sql"))
      .sort();

    const checkStmt = sqlite.prepare(
      "SELECT 1 FROM __applied_migrations WHERE filename = ?",
    );
    const insertStmt = sqlite.prepare(
      "INSERT OR IGNORE INTO __applied_migrations (filename) VALUES (?)",
    );

    for (const file of files) {
      if (checkStmt.get(file)) continue;
      const content = await readFile(path.join(migrationsDir, file), "utf-8");
      const statements = content
        .split("--> statement-breakpoint")
        .map((s) => s.trim())
        .filter((s) => s.length > 0 && !s.split("\n").every((l) => l.trim().startsWith("--")));

      for (const stmt of statements) {
        try {
          sqlite.exec(stmt);
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          if (/already exists|duplicate/i.test(msg)) continue;
          throw err;
        }
      }
      insertStmt.run(file);
      console.log(`[open3dreel:migrate] applied ${file}`);
    }

    console.log("[open3dreel:migrate] done");
  } catch (err) {
    console.error("[open3dreel:migrate] FAILED:", err);
  }
}
