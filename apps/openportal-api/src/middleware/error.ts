import type { ErrorHandler } from "hono";

export const errorHandler: ErrorHandler = (err, c) => {
  console.error("[openportal-api]", err);
  const status = (err as { status?: number }).status ?? 500;
  return c.json(
    {
      error: err.message || "Internal Server Error",
    },
    status as 500,
  );
};
