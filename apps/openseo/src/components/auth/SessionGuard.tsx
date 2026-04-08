"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { type UserRole, checkRole, checkPermission } from "@opensoftware/config/rbac";

interface SessionGuardProps {
  children: ReactNode;
  /** Minimum role required to access this content */
  requiredRole?: UserRole;
  /** Specific permission string required */
  requiredPermission?: string;
  /** Content shown while loading session */
  loading?: ReactNode;
  /** Content shown when access is denied (defaults to built-in message) */
  fallback?: ReactNode;
}

/**
 * Client-side guard that checks authentication and authorization.
 * Redirects unauthenticated users to /login.
 * Shows access denied for authenticated users without sufficient permissions.
 */
export function SessionGuard({
  children,
  requiredRole,
  requiredPermission,
  loading,
  fallback,
}: SessionGuardProps) {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  if (status === "loading") {
    return (
      loading ?? (
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="text-gray-500">Loading...</div>
        </div>
      )
    );
  }

  if (status === "unauthenticated" || !session?.user) {
    return null;
  }

  const user = {
    ...session.user,
    name: session.user.name ?? null,
    role: session.user.role as UserRole,
    permissions: session.user.permissions ?? [],
  };

  if (requiredRole && !checkRole(user, requiredRole)) {
    return (
      fallback ?? (
        <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
          <div className="text-2xl font-semibold text-red-600">Access Denied</div>
          <p className="text-gray-500">
            You need the <strong>{requiredRole}</strong> role to access this page.
          </p>
          <p className="text-sm text-gray-400">
            Your current role: <strong>{session.user.role}</strong>
          </p>
        </div>
      )
    );
  }

  if (requiredPermission && !checkPermission(user, requiredPermission)) {
    return (
      fallback ?? (
        <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
          <div className="text-2xl font-semibold text-red-600">Access Denied</div>
          <p className="text-gray-500">
            You do not have the required permission: <strong>{requiredPermission}</strong>
          </p>
        </div>
      )
    );
  }

  return <>{children}</>;
}
