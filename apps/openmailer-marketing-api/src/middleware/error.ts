import type { Context } from "hono";
import { ZodError } from "zod";

export function errorHandler(err: Error, c: Context) {
  console.error("Unhandled error:", err);

  if (err instanceof ZodError) {
    return c.json(
      {
        error: "Validation error",
        details: err.errors.map((e) => ({
          path: e.path.join("."),
          message: e.message,
        })),
      },
      400,
    );
  }

  if ("statusCode" in err && typeof (err as any).statusCode === "number") {
    return c.json(
      { error: err.message },
      (err as any).statusCode as 400 | 401 | 403 | 404 | 409 | 500,
    );
  }

  return c.json({ error: "Internal server error" }, 500);
}
