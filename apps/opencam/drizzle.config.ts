import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "../../packages/db/src/opencam.schema.ts",
  out: "./drizzle/migrations",
  dialect: "sqlite",
  dbCredentials: {
    url: process.env.DATABASE_URL || "./data/opencam.db",
  },
  verbose: true,
  strict: true,
});
