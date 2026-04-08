import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { type UserRole, checkRole, checkPermission, toUserRole } from "@opensoftware/config/rbac";
import { getPermissionsForRole, OPENSEO_PERMISSIONS } from "@opensoftware/config/rbac";

/**
 * Server-side auth guard for API routes.
 * Returns the authenticated user or a JSON error response.
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
  const permissions = getPermissionsForRole(OPENSEO_PERMISSIONS, role);

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
