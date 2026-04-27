import NextAuth from "next-auth";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { eq } from "drizzle-orm";
import Credentials from "next-auth/providers/credentials";
import type { Provider } from "next-auth/providers";
import {
  type UserRole,
  type AuthUser,
  toUserRole,
  getPermissionsForRole,
  OPENSEM_PERMISSIONS,
} from "@opensoftware/config/rbac";

// Lazy-import db to avoid triggering better-sqlite3 / fs at module evaluation
// time (which breaks Edge Runtime and next build page data collection).
function getDb() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { db, schema } = require("@/db") as typeof import("@/db");
  return { db, schema };
}

const providers: Provider[] = [];

if (process.env.FINDERAUTH_ISSUER && process.env.FINDERAUTH_CLIENT_ID && process.env.FINDERAUTH_CLIENT_SECRET) {
  providers.push({
    id: "finderauth",
    name: "FinderAuth",
    type: "oidc",
    issuer: process.env.FINDERAUTH_ISSUER,
    clientId: process.env.FINDERAUTH_CLIENT_ID,
    clientSecret: process.env.FINDERAUTH_CLIENT_SECRET,
    authorization: { params: { scope: "openid email profile" } },
    profile(profile) {
      return {
        id: profile.sub as string,
        email: (profile.email as string) || `${profile.sub}@finderauth.local`,
        name: (profile.name as string) || (profile.email as string)?.split("@")[0],
        image: profile.picture as string | undefined,
      };
    },
  });
}

// Dev credentials (always available in development)
if (process.env.NODE_ENV === "development") {
  providers.push(
    Credentials({
      id: "dev-credentials",
      name: "Dev Login",
      credentials: {
        email: { label: "Email", type: "email" },
        role: { label: "Role", type: "text" },
      },
      async authorize(credentials) {
        const email = (credentials?.email as string)?.trim();
        if (!email) return null;

        const requestedRole = (credentials?.role as string)?.trim() || "viewer";

        return {
          id: crypto.randomUUID(),
          email,
          name: email.split("@")[0],
          role: requestedRole,
        };
      },
    })
  );
}

// Build a lazy adapter that defers DrizzleAdapter creation until first use.
// This avoids calling DrizzleAdapter(db) at module evaluation time where `db`
// is still a Proxy stub — the adapter would reject it with
// "Unsupported database type (object)".
function createLazyAdapter() {
  let _adapter: ReturnType<typeof DrizzleAdapter> | null = null;
  function get(): ReturnType<typeof DrizzleAdapter> {
    if (!_adapter) {
      const { db, schema } = getDb();
      _adapter = DrizzleAdapter(db, {
        usersTable: schema.users,
        accountsTable: schema.accounts,
        sessionsTable: schema.sessions,
        verificationTokensTable: schema.verificationTokens,
      } as any);
    }
    return _adapter;
  }
  // Return a proxy that forwards every property access to the real adapter
  return new Proxy({} as ReturnType<typeof DrizzleAdapter>, {
    get(_target, prop, receiver) {
      const real = get();
      const val = Reflect.get(real, prop, receiver);
      return typeof val === "function" ? val.bind(real) : val;
    },
  });
}

// @ts-ignore NextAuth v5 type portability
export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  adapter: createLazyAdapter(),
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers,
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as Record<string, unknown>).role as string | undefined;
      }

      if (!token.role && token.id) {
        try {
          const { db, schema } = getDb();
          const dbUser = await db.query.users.findFirst({
            where: eq(schema.users.id, token.id as string),
            columns: { role: true },
          });
          token.role = dbUser?.role ?? "viewer";
        } catch {
          token.role = "viewer";
        }
      }

      token.role = toUserRole(token.role as string);
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        const role = toUserRole(token.role as string);
        session.user.role = role;
        session.user.permissions = getPermissionsForRole(OPENSEM_PERMISSIONS, role);
      }
      return session;
    },
  },
});

export { checkRole, checkPermission, type AuthUser, type UserRole } from "@opensoftware/config/rbac";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      image?: string | null;
      role: UserRole;
      permissions: string[];
    };
  }
}
