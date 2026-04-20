import type { Context } from "hono";

export function requireParam(c: Context, name: string): string {
  const v = c.req.param(name);
  if (!v) {
    throw Object.assign(new Error(`Missing path param: ${name}`), {
      status: 400,
    });
  }
  return v;
}
