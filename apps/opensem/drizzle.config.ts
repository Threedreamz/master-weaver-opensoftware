import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/db/postgres-schema.ts",
  out: "./drizzle/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL || "postgresql://localhost:5432/opensem_dev",
  },
});
