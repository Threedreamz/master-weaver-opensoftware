/**
 * Role-Based Access Control (RBAC) shared across all OpenSoftware apps.
 *
 * Roles follow a strict hierarchy: admin > editor > viewer > guest.
 * Each app defines its own permission map, but the role checking logic is shared.
 */

export const USER_ROLES = ["guest", "viewer", "editor", "admin"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  image?: string | null;
  role: UserRole;
  permissions: string[];
}

/** Ordered from least to most privileged */
const ROLE_HIERARCHY: UserRole[] = ["guest", "viewer", "editor", "admin"];

/**
 * Check whether a user's role meets or exceeds the required role.
 * Returns false for null/undefined users.
 */
export function checkRole(user: AuthUser | null | undefined, requiredRole: UserRole): boolean {
  if (!user) return false;
  const userLevel = ROLE_HIERARCHY.indexOf(user.role);
  const requiredLevel = ROLE_HIERARCHY.indexOf(requiredRole);
  if (userLevel === -1 || requiredLevel === -1) return false;
  return userLevel >= requiredLevel;
}

/**
 * Check whether a user has a specific permission string.
 * Admins implicitly have all permissions.
 */
export function checkPermission(user: AuthUser | null | undefined, permission: string): boolean {
  if (!user) return false;
  if (user.role === "admin") return true;
  return user.permissions.includes(permission);
}

/**
 * Validate that a string is a valid UserRole.
 */
export function isValidRole(role: string): role is UserRole {
  return USER_ROLES.includes(role as UserRole);
}

/**
 * Safely cast a string to UserRole, falling back to "guest" for unknown values.
 */
export function toUserRole(role: string | null | undefined): UserRole {
  if (role && isValidRole(role)) return role;
  return "guest";
}

// ==================== Per-App Permission Maps ====================

/**
 * Permission definitions per app.
 * Each app maps roles to specific permission strings.
 * Admin always has all permissions (handled by checkPermission).
 */

export const OPENACCOUNTING_PERMISSIONS: Record<Exclude<UserRole, "admin">, string[]> = {
  editor: [
    "accounting:transactions:read",
    "accounting:transactions:write",
    "accounting:invoices:read",
    "accounting:invoices:write",
    "accounting:customers:read",
    "accounting:customers:write",
    "accounting:suppliers:read",
    "accounting:suppliers:write",
    "accounting:booking:read",
    "accounting:booking:write",
    "accounting:documents:read",
    "accounting:documents:write",
    "accounting:matching:read",
    "accounting:matching:write",
    "accounting:reports:read",
  ],
  viewer: [
    "accounting:transactions:read",
    "accounting:invoices:read",
    "accounting:customers:read",
    "accounting:suppliers:read",
    "accounting:reports:read",
    "accounting:documents:read",
    "accounting:kontenplan:read",
  ],
  guest: [],
};

export const OPENMAILER_PERMISSIONS: Record<Exclude<UserRole, "admin">, string[]> = {
  editor: [
    "mail:compose",
    "mail:send",
    "mail:templates:read",
    "mail:templates:write",
    "mail:inbox:read",
    "mail:logs:read",
    "mail:stats:read",
    "mail:settings:read",
  ],
  viewer: [
    "mail:inbox:read",
    "mail:logs:read",
    "mail:stats:read",
    "mail:templates:read",
  ],
  guest: [],
};

export const OPENLAWYER_PERMISSIONS: Record<Exclude<UserRole, "admin">, string[]> = {
  editor: [
    "legal:documents:read",
    "legal:documents:write",
    "legal:projects:read",
    "legal:projects:write",
    "legal:templates:read",
    "legal:templates:write",
    "legal:monitoring:read",
    "legal:reviewers:read",
  ],
  viewer: [
    "legal:documents:read",
    "legal:projects:read",
    "legal:templates:read",
    "legal:monitoring:read",
    "legal:reviewers:read",
  ],
  guest: [],
};

export const OPENSEM_PERMISSIONS: Record<Exclude<UserRole, "admin">, string[]> = {
  editor: [
    // Organic SEO
    "seo:audit:read", "seo:audit:write",
    "seo:keywords:read", "seo:keywords:write",
    "seo:meta:read", "seo:meta:write",
    "seo:analytics:read",
    "seo:rankings:read",
    "seo:pagespeed:read",
    "seo:semrush:read",
    // Paid Search
    "paid:dashboard:read",
    "paid:campaigns:read", "paid:campaigns:write",
    "paid:keywords:read", "paid:keywords:write",
    "paid:budget:read", "paid:budget:write",
    "paid:searchterms:read",
    "paid:assets:read", "paid:assets:write",
    // Intelligence
    "intel:competitors:read",
    "intel:bridge:read",
    "intel:recommendations:read",
    // Settings
    "settings:integrations:read", "settings:integrations:write",
  ],
  viewer: [
    "seo:analytics:read", "seo:rankings:read", "seo:pagespeed:read",
    "seo:audit:read", "seo:meta:read", "seo:semrush:read",
    "paid:dashboard:read", "paid:campaigns:read",
    "paid:keywords:read", "paid:searchterms:read",
    "intel:competitors:read", "intel:bridge:read", "intel:recommendations:read",
  ],
  guest: [],
};

export const OPENFARM_PERMISSIONS: Record<Exclude<UserRole, "admin">, string[]> = {
  editor: [
    "farm:printers:read",
    "farm:printers:write",
    "farm:models:read",
    "farm:models:write",
    "farm:jobs:read",
    "farm:jobs:write",
    "farm:jobs:cancel",
    "farm:batch:read",
    "farm:batch:write",
    "farm:profiles:read",
    "farm:profiles:write",
    "farm:materials:read",
    "farm:materials:write",
    "farm:dashboard:read",
    "farm:settings:read",
    "farm:settings:write",
  ],
  viewer: [
    "farm:printers:read",
    "farm:models:read",
    "farm:jobs:read",
    "farm:batch:read",
    "farm:profiles:read",
    "farm:materials:read",
    "farm:dashboard:read",
  ],
  guest: [],
};

// ==================== Integration Permissions (shared across all apps) ====================

export const INTEGRATION_PERMISSIONS: Record<Exclude<UserRole, "admin">, string[]> = {
  editor: [
    "integrations:connections:read",
    "integrations:connections:write",
    "integrations:events:read",
    "integrations:webhooks:read",
    "integrations:sync:trigger",
  ],
  viewer: [
    "integrations:connections:read",
    "integrations:events:read",
  ],
  guest: [],
};

/**
 * Resolve the full permissions array for a given role in a given app.
 */
export function getPermissionsForRole(
  appPermissions: Record<Exclude<UserRole, "admin">, string[]>,
  role: UserRole
): string[] {
  if (role === "admin") return []; // admin bypasses permission checks entirely
  return appPermissions[role] ?? [];
}

// ==================== Route Protection Helpers ====================

/** Routes that are always public (no auth required) */
export const PUBLIC_ROUTES = ["/login", "/api/auth"];

/**
 * Check if a pathname matches any public route prefix.
 */
export function isPublicRoute(pathname: string): boolean {
  // Strip locale prefix (e.g., /en/login -> /login)
  const withoutLocale = pathname.replace(/^\/[a-z]{2}(?=\/|$)/, "");
  return PUBLIC_ROUTES.some((route) => withoutLocale === route || withoutLocale.startsWith(route + "/"));
}
