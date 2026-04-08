"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { type UserRole, checkRole, checkPermission } from "@opensoftware/config/rbac";

interface SessionGuardProps {
  children: ReactNode;
  requiredRole?: UserRole;
  requiredPermission?: string;
  loading?: ReactNode;
  fallback?: ReactNode;
}

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
