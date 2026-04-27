import NextAuth from "next-auth";
import type { Provider } from "next-auth/providers";

const providers: Provider[] = [];

// 3DreamzAuth OIDC provider — registered with the issuer at FINDERAUTH_ISSUER.
// The provider id MUST be "finderauth" (callback path /api/auth/callback/finderauth)
// to match the redirect_uri the OIDC client is registered with — see
// known-pitfalls.md "MWAuth / OIDC Auth" entry. The display name is "3Dreamz".
if (
  process.env.FINDERAUTH_ISSUER &&
  process.env.FINDERAUTH_CLIENT_ID &&
  process.env.FINDERAUTH_CLIENT_SECRET
) {
  providers.push({
    id: "finderauth",
    name: process.env.AUTH_BRAND_NAME ?? "3Dreamz",
    type: "oidc",
    issuer: process.env.FINDERAUTH_ISSUER,
    clientId: process.env.FINDERAUTH_CLIENT_ID,
    clientSecret: process.env.FINDERAUTH_CLIENT_SECRET,
    authorization: { params: { scope: "openid email profile" } },
    profile(profile) {
      const sub = profile.sub as string;
      const email = (profile.email as string) || `${sub}@finderauth.local`;
      return {
        id: sub,
        email,
        name:
          (profile.name as string | undefined) ??
          email.split("@")[0] ??
          null,
        image: (profile.picture as string | undefined) ?? null,
      };
    },
  });
}

// @ts-ignore NextAuth v5 type portability
export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  session: { strategy: "jwt" },
  providers,
  pages: { signIn: "/login" },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
        token.image = user.image;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = (token.id as string) ?? session.user.id;
        if (token.email) session.user.email = token.email as string;
        if (token.name) session.user.name = token.name as string;
        if (token.image) session.user.image = token.image as string;
      }
      return session;
    },
  },
});

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
