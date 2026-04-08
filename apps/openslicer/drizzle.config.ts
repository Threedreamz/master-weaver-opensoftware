import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "../../packages/db/src/openslicer.schema.ts",
  out: "./drizzle/migrations",
  dialect: "sqlite",
  dbCredentials: {
    url: process.env.DATABASE_URL || "./data/openslicer.db",
  },
  verbose: true,
  strict: true,
});
