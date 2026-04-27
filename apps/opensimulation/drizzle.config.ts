import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: [
    "../../packages/db/src/shared.schema.ts",
    "../../packages/db/src/opensimulation.schema.ts",
  ],
  out: "./drizzle/migrations",
  dialect: "sqlite",
  dbCredentials: {
    url: process.env.DATABASE_URL || "./data/opensimulation.db",
  },
  verbose: true,
  strict: true,
});
