import type { Config } from "drizzle-kit";

export default {
  schema: "./src/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.OPENPORTAL_DATABASE_URL ?? "postgres://localhost:5432/openportal",
  },
} satisfies Config;
