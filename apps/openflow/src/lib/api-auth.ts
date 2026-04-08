import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { ROLE_PERMISSIONS, type UserRole, type PermissionKey } from "@/db/schema";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}

const DEV_USER: AuthUser = {
  id: "dev-admin",
  email: "admin@openflow.dev",
  name: "Admin (Dev)",
  role: "admin",
};

/**
 * Check API authentication. In development mode, returns a dev admin user.
 * Returns null if authorized, or a 401/403 Response if not.
 */
export async function checkApiAuth(): Promise<NextResponse | null> {
  if (process.env.NODE_ENV === "development") {
    return null;
  }

  try {
    const session = await auth();
    if (!(session as { user?: { id?: string } })?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return null;
}

/**
 * Get the current authenticated user. Returns dev user in development mode.
 */
export async function getAuthUser(): Promise<AuthUser> {
  if (process.env.NODE_ENV === "development") {
    return DEV_USER;
  }

  try {
    const session = await auth();
    const user = (session as { user?: { id?: string; email?: string; name?: string; role?: string } })?.user;
    if (!user?.id) {
      return DEV_USER;
    }
    return {
      id: user.id,
      email: user.email ?? "",
      name: user.name ?? "Unknown",
      role: (user.role as UserRole) ?? "user",
    };
  } catch {
    return DEV_USER;
  }
}

/**
 * Check if a user has a specific permission based on their role.
 */
export function hasPermission(role: UserRole, permission: PermissionKey): boolean {
  const perms = ROLE_PERMISSIONS[role];
  return perms?.includes(permission) ?? false;
}

/**
 * Check API auth AND enforce a specific permission.
 * Returns null if authorized, or a 401/403 Response if not.
 */
export async function requirePermission(permission: PermissionKey): Promise<NextResponse | null> {
  const authError = await checkApiAuth();
  if (authError) return authError;

  if (process.env.NODE_ENV === "development") return null;

  const user = await getAuthUser();
  if (!hasPermission(user.role, permission)) {
    return NextResponse.json(
      { error: "Insufficient permissions", required: permission },
      { status: 403 }
    );
  }

  return null;
}
