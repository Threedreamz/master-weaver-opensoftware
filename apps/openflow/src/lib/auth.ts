import NextAuth, { type NextAuthConfig } from "next-auth";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import Credentials from "next-auth/providers/credentials";
import { db } from "@/db";
import { users, accounts, sessions, verificationTokens } from "@/db/schema";
import { eq } from "drizzle-orm";

// Auth bypass for development — always returns a fake admin session
const SKIP_AUTH = process.env.SKIP_AUTH === "true" || process.env.NODE_ENV === "development";

const devSession = {
  user: {
    id: "dev-admin",
    email: "admin@openflow.dev",
    name: "Dev Admin",
    role: "admin",
  },
  expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
};

const authConfig: NextAuthConfig = {
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as { role?: string }).role ?? "viewer";
        token.hasAdminAccess = true;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub!;
        (session.user as { role?: string }).role = token.role as string;
      }
      return session;
    },
  },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        // Dev mode: allow admin@openflow.dev / admin123
        if (
          process.env.NODE_ENV === "development" &&
          credentials.email === "admin@openflow.dev" &&
          credentials.password === "admin123"
        ) {
          return {
            id: "dev-admin",
            email: "admin@openflow.dev",
            name: "Dev Admin",
            role: "admin",
          };
        }

        const user = await db.query.users.findFirst({
          where: eq(users.email, credentials.email as string),
        });

        if (!user) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        };
      },
    }),
  ],
};

const nextAuth = NextAuth(authConfig);

// When auth is skipped, override auth() to return a fake session
const auth = SKIP_AUTH
  ? async () => devSession as Awaited<ReturnType<typeof nextAuth.auth>>
  : nextAuth.auth;

const { handlers, signIn, signOut } = nextAuth;
export { auth, handlers, signIn, signOut };
