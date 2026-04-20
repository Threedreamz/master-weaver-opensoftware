import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { type UserRole, checkRole, checkPermission, toUserRole } from "@opensoftware/config/rbac";
import { getPermissionsForRole, OPENCAD_PERMISSIONS } from "@opensoftware/config/rbac";

/**
 * Server-side auth guard for API routes.
 * Returns the authenticated user or a JSON error response.
 *
 * Usage in route handlers:
 *   const result = await requireAuth({ role: "editor" });
 *   if (result instanceof NextResponse) return result;
 *   const user = result;
 */
export async function requireAuth(options?: {
  role?: UserRole;
  permission?: string;
}): Promise<
  | NextResponse
  | {
      id: string;
      email: string;
      name?: string | null;
      role: UserRole;
      permissions: string[];
    }
> {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = toUserRole(session.user.role);
  const permissions = getPermissionsForRole(OPENCAD_PERMISSIONS, role);

  const user = {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name ?? null,
    role,
    permissions,
  };

  if (options?.role && !checkRole(user, options.role)) {
    return NextResponse.json(
      { error: "Forbidden", message: `Requires ${options.role} role` },
      { status: 403 }
    );
  }

  if (options?.permission && !checkPermission(user, options.permission)) {
    return NextResponse.json(
      { error: "Forbidden", message: `Missing permission: ${options.permission}` },
      { status: 403 }
    );
  }

  return user;
}

/**
 * API-key guard for service-to-service endpoints (gateway -> service).
 *
 * Throws a 401 JSON Response when:
 *   - OPENSOFTWARE_API_KEY is not configured on the server
 *   - X-API-Key header is missing
 *   - X-API-Key header does not match OPENSOFTWARE_API_KEY
 *
 * Usage in route handlers:
 *   export async function GET(req: NextRequest) {
 *     requireApiKey(req);
 *     // ... proceed
 *   }
 */
export function requireApiKey(req: NextRequest | Request): void {
  const expected = process.env.OPENSOFTWARE_API_KEY;
  if (!expected) {
    throw NextResponse.json(
      { error: "Server misconfigured", message: "OPENSOFTWARE_API_KEY not set" },
      { status: 401 }
    );
  }

  const provided = req.headers.get("x-api-key");
  if (!provided || provided !== expected) {
    throw NextResponse.json(
      { error: "Unauthorized", message: "Invalid or missing X-API-Key" },
      { status: 401 }
    );
  }
}
