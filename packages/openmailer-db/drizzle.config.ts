import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.OPENMAILER_DATABASE_URL || "postgresql://openmailer:openmailer@localhost:5432/openmailer",
  },
  verbose: true,
  strict: true,
});
