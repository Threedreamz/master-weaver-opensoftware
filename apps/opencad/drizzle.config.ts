import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: [
    "../../packages/db/src/shared.schema.ts",
    "../../packages/db/src/opencad.schema.ts",
  ],
  out: "./drizzle/migrations",
  dialect: "sqlite",
  dbCredentials: {
    url: process.env.DATABASE_URL || "./data/opencad.db",
  },
  verbose: true,
  strict: true,
});
