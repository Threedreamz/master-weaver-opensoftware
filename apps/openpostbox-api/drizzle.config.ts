import { defineConfig } from "drizzle-kit";
import path from "path";

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "sqlite",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? `file:${path.join(process.cwd(), "data", "openpostbox.db")}`,
  },
  verbose: true,
  strict: true,
});
