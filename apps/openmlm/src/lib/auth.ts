import NextAuth from "next-auth";
import type { Provider } from "next-auth/providers";

const providers: Provider[] = [];

if (
  process.env.FINDERAUTH_ISSUER &&
  process.env.FINDERAUTH_CLIENT_ID &&
  process.env.FINDERAUTH_CLIENT_SECRET
) {
  providers.push({
    id: "finderauth",
    name: "3Dreamz",
    type: "oidc",
    issuer: process.env.FINDERAUTH_ISSUER,
    clientId: process.env.FINDERAUTH_CLIENT_ID,
    clientSecret: process.env.FINDERAUTH_CLIENT_SECRET,
    authorization: { params: { scope: "openid email profile" } },
    profile(profile) {
      return {
        id: profile.sub as string,
        email: (profile.email as string) || `${profile.sub}@finderauth.local`,
        name:
          (profile.name as string) ||
          (profile.email as string)?.split("@")[0] ||
          "user",
        image: profile.picture as string | undefined,
      };
    },
  });
}

// @ts-ignore NextAuth v5 type portability
const _result = NextAuth({
  trustHost: true,
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers,
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.id) {
        (session.user as { id: string }).id = token.id as string;
      }
      return session;
    },
  },
});

export const handlers = _result.handlers;
export const auth: typeof _result.auth = _result.auth;
export const signIn = _result.signIn;
export const signOut = _result.signOut;

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      image?: string | null;
    };
  }
}
