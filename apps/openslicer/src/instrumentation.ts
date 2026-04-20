/**
 * Next.js instrumentation hook — runs ONCE per server process at boot,
 * BEFORE any route handler is invoked.
 *
 * Must live at src/instrumentation.ts (not app-root) because openslicer uses
 * the src/ layout — Next.js only picks up the file from one place depending
 * on that. Previous root-level copy was silently ignored and every query
 * against slicer_printer_profiles returned 500.
 *
 * Idempotent: migrate() is a no-op once __drizzle_migrations is up-to-date,
 * and the seed script checks for an existing "Demo Overhang Test" row before
 * inserting. Safe to run on every container start.
 *
 * Failure mode: any error is logged with [openslicer:boot] prefix and
 * re-thrown so the container crashes loudly instead of serving 500s silently.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const { mkdirSync, existsSync } = await import("fs");
  const { dirname, resolve } = await import("path");
  const { migrate } = await import("drizzle-orm/better-sqlite3/migrator");

  const dbPath = (process.env.DATABASE_URL || "./data/openslicer.db").replace(/^file:/, "");
  const dataDir = dirname(dbPath);

  try {
    if (!existsSync(dataDir)) {
      mkdirSync(dataDir, { recursive: true });
      console.log(`[openslicer:boot] created data dir ${dataDir}`);
    }

    const { db } = await import("./db/index");

    // In Next 16 standalone, cwd is `/app` (monorepo root) because the CMD is
    // `node apps/openslicer/server.js` from WORKDIR /app — so a bare
    // `drizzle/migrations` relative path would resolve to `/app/drizzle/migrations`
    // which does NOT exist. The Dockerfile bakes migrations at
    // `/app/apps/openslicer/drizzle/migrations`. Prefer an explicit env var
    // (OPENSLICER_MIGRATIONS_DIR), fall back to the apps/openslicer path in
    // production and the local relative path in dev (cwd = apps/openslicer).
    const migrationsFolder = process.env.OPENSLICER_MIGRATIONS_DIR
      ? resolve(process.env.OPENSLICER_MIGRATIONS_DIR)
      : process.env.NODE_ENV === "production"
        ? "/app/apps/openslicer/drizzle/migrations"
        : resolve(process.cwd(), "drizzle/migrations");
    console.log(`[openslicer:boot] running migrations from ${migrationsFolder}`);
    // The Dockerfile regenerates drizzle/migrations via `drizzle-kit generate` on
    // every build, which produces NEW timestamp-prefixed filenames each time.
    // When Railway reuses the persistent SQLite volume across deploys, the
    // __drizzle_migrations journal references old filenames while the bundled
    // migration files are freshly named — so Drizzle thinks every migration is
    // new and tries to re-run CREATE TABLE on already-existing tables.
    // Tolerate "already exists" errors so boot continues; the schema on disk
    // matches the schema in code, so the app is functionally correct.
    try {
      migrate(db as never, { migrationsFolder });
      console.log(`[openslicer:boot] migrations complete`);
    } catch (migErr) {
      const cause = (migErr as { cause?: { code?: string; message?: string } })?.cause;
      const causeMsg = cause?.message ?? "";
      const isAlreadyExists =
        cause?.code === "SQLITE_ERROR" &&
        (causeMsg.includes("already exists") || causeMsg.includes("duplicate column"));
      if (isAlreadyExists) {
        console.warn(
          `[openslicer:boot] migration idempotency skip — schema already present on volume (${causeMsg.split("\n")[0]})`,
        );
      } else {
        throw migErr;
      }
    }

    // One-shot FK-drop migration for deployed volumes whose slicer_history table
    // still has `profile_id REFERENCES slicer_profiles(id)` — the FK blocks every
    // slice whose profile is a process-profile UUID with SQLITE_CONSTRAINT failure.
    // True no-op on fresh volumes (new CREATE TABLE already lacks the FK) because
    // the guard inspects sqlite_master.sql for the old REFERENCES clause.
    try {
      const Database = (await import("better-sqlite3")).default;
      const probe = new Database(dbPath);
      try {
        const row = probe
          .prepare(
            `SELECT sql FROM sqlite_master WHERE type='table' AND name='slicer_history'`,
          )
          .get() as { sql?: string } | undefined;

        // Diagnostic: list every FK clause (REFERENCES) still on slicer_history.
        // Catches not just `profile_id REFERENCES slicer_profiles` (the original
        // footgun) but any column → table FK — so future "FOREIGN KEY
        // constraint failed" incidents can be diagnosed from boot logs alone
        // without spelunking the volume via `railway ssh + sqlite3`.
        //
        // Matches e.g. `profile_id text REFERENCES slicer_profiles(id)` and
        // `model_id text REFERENCES slicer_models(id)`. Case-insensitive,
        // multi-line; captures the column word preceding REFERENCES and the
        // referenced table so the log entry is self-describing.
        if (row?.sql) {
          const fkRegex = /(\w+)\s+[^,()]*REFERENCES\s+(\w+)\s*\(\s*(\w+)\s*\)/gi;
          const fks: Array<{ column: string; refTable: string; refColumn: string }> = [];
          let match: RegExpExecArray | null;
          while ((match = fkRegex.exec(row.sql)) !== null) {
            fks.push({ column: match[1], refTable: match[2], refColumn: match[3] });
          }
          if (fks.length === 0) {
            console.log(`[openslicer:boot] slicer_history FKs report: none`);
          } else {
            const summary = fks
              .map((f) => `${f.column}→${f.refTable}.${f.refColumn}`)
              .join(", ");
            console.log(
              `[openslicer:boot] slicer_history FKs report: ${fks.length} FK(s) — ${summary}`,
            );
          }
        }

        const needsDrop =
          row?.sql && /profile_id[^,]*REFERENCES\s+slicer_profiles/i.test(row.sql);
        if (needsDrop) {
          console.log(`[openslicer:boot] applying drop-history-profile-fk migration`);
          const { readFileSync } = await import("fs");
          const { join } = await import("path");
          const sqlPath =
            process.env.NODE_ENV === "production"
              ? "/app/apps/openslicer/scripts/migrate-drop-history-profile-fk.sql"
              : join(process.cwd(), "scripts/migrate-drop-history-profile-fk.sql");
          const sql = readFileSync(sqlPath, "utf8");
          probe.exec(sql);
          console.log(`[openslicer:boot] drop-history-profile-fk migration complete`);
        } else {
          console.log(`[openslicer:boot] slicer_history profile_id FK already absent, skipping drop migration`);
        }

        // Sanity: count orphan slicer_history rows whose model_id points
        // at a now-missing slicer_models row. Surfaces volume-corruption
        // issues (e.g. partial reset) without blocking boot.
        try {
          const orphan = probe
            .prepare(
              `SELECT COUNT(*) AS n FROM slicer_history
               WHERE model_id IS NOT NULL
                 AND model_id NOT IN (SELECT id FROM slicer_models)`,
            )
            .get() as { n?: number } | undefined;
          const orphanCount = orphan?.n ?? 0;
          if (orphanCount > 0) {
            console.warn(
              `[openslicer:boot] WARNING — ${orphanCount} slicer_history row(s) reference missing slicer_models ids. ` +
                `Volume may have been partially reset. New slices against those ids will 400.`,
            );
          } else {
            console.log(`[openslicer:boot] slicer_history model_id integrity OK`);
          }
        } catch (intErr) {
          console.warn(`[openslicer:boot] orphan check skipped:`, intErr);
        }
      } finally {
        probe.close();
      }
    } catch (fkErr) {
      console.error(`[openslicer:boot] drop-history-profile-fk migration FAILED (non-fatal):`, fkErr);
    }

    try {
      const { eq } = await import("drizzle-orm");
      const { slicerModels } = await import("./db/schema");
      const sentinel = (db as never as {
        select: () => {
          from: (t: unknown) => { where: (c: unknown) => { get: () => unknown } };
        };
      })
        .select()
        .from(slicerModels)
        .where(eq((slicerModels as never as { name: unknown }).name, "Demo Overhang Test"))
        .get();

      if (!sentinel) {
        console.log(`[openslicer:boot] sentinel missing, running demo seed`);
        // Import under src/ so Next.js traces + bundles the module into the
        // standalone output. A previous import from "../scripts/seed-demo"
        // was outside the traced tree and failed ERR_MODULE_NOT_FOUND.
        const { seedDemo } = await import("./lib/seed/seed-demo");
        const result = await seedDemo();
        console.log(
          `[openslicer:boot] demo seed complete — model=${result.modelId} ` +
            `printers=${result.printerProfileIds.length} ` +
            `filaments=${result.filamentProfileIds.length} ` +
            `processes=${result.processProfileIds.length}`,
        );
      } else {
        console.log(`[openslicer:boot] sentinel found, skipping seed`);
      }
    } catch (seedErr) {
      console.error(`[openslicer:boot] demo seed FAILED (non-fatal):`, seedErr);
    }
  } catch (err) {
    console.error(`[openslicer:boot] FATAL — db init failed:`, err);
    throw err;
  }
}
