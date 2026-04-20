import NextAuth from "next-auth";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import Credentials from "next-auth/providers/credentials";
import type { Provider } from "next-auth/providers";
import {
  type UserRole,
  type AuthUser,
  toUserRole,
  getPermissionsForRole,
  OPENCAD_PERMISSIONS,
} from "@opensoftware/config/rbac";

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

        // In dev mode, allow specifying a role (defaults to "viewer", NOT "admin")
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

// @ts-ignore NextAuth v5 type portability
export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  ...(process.env.DOCKER_BUILD ? {} : {
    adapter: DrizzleAdapter(db, {
      usersTable: schema.users,
      accountsTable: schema.accounts,
      sessionsTable: schema.sessions,
      verificationTokensTable: schema.verificationTokens,
    }),
  }),
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers,
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        // Read role from the user object (set by provider or DB)
        // The "role" field comes from the credentials provider or from the DB via adapter
        token.role = (user as Record<string, unknown>).role as string | undefined;
      }

      // If role is not set yet, look it up from the database
      if (!token.role && token.id) {
        try {
          const dbUser = await db.query.users.findFirst({
            where: eq(schema.users.id, token.id as string),
            columns: { role: true },
          });
          token.role = dbUser?.role ?? "viewer";
        } catch {
          // DB lookup failed — default to viewer (safe fallback)
          token.role = "viewer";
        }
      }

      // Validate the role is a known value; fallback to viewer for safety
      token.role = toUserRole(token.role as string);

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        const role = toUserRole(token.role as string);
        session.user.role = role;
        session.user.permissions = getPermissionsForRole(OPENCAD_PERMISSIONS, role);
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
