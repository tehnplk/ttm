import NextAuth, { type Session, type NextAuthConfig } from "next-auth";
import type { JWT } from "next-auth/jwt";
import CredentialsProvider from "next-auth/providers/credentials";

const authOptions: NextAuthConfig = {
  session: {
    strategy: "jwt",
    maxAge: 60 * 60 * 25, // 25 hours
  },
  providers: [
    CredentialsProvider({
      name: "Provider ID",
      credentials: {
        "cred-way": { label: "Credential Way", type: "text" },
        profile: { label: "Profile", type: "text" },
      },
      async authorize(credentials) {
        // Handle Provider ID login
        if (credentials && credentials["cred-way"] === "provider-id") {
          return {
            id: "provider-id",
            name: "provider-id",
            profile: credentials.profile as string,
          };
        }
        return null;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }: { token: JWT; user?: any }) {
      if (user) {
        token.profile = (user as any).profile;
      }
      return token;
    },
    async session({ session, token }: { session: Session; token: JWT }) {
      if (token && session.user) {
        (session.user as any).profile = (token as any).profile;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
};

export const { handlers, auth, signIn, signOut } = NextAuth(authOptions);

