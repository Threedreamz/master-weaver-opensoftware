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
 * AUTH DISABLED for development — always renders children.
 */
export function SessionGuard({
  children,
}: SessionGuardProps) {
  return <>{children}</>;
}
