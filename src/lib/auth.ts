import type { NextAuthOptions } from "next-auth";
import Google from "next-auth/providers/google";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { db } from "./db";
import { getStaffMember } from "./admin";

export const authOptions: NextAuthOptions = {
  adapter: DrizzleAdapter(db) as NextAuthOptions["adapter"],
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  session: {
    strategy: "jwt",
  },
  debug: process.env.NODE_ENV === "development" || process.env.NEXTAUTH_DEBUG === "1",
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async signIn({ user, account }) {
      // Log sign-in attempts to help debug callback errors
      console.log("[NextAuth] signIn callback:", {
        userId: user?.id,
        email: user?.email,
        provider: account?.provider,
      });
      return true;
    },

    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }

      if (token.id) {
        try {
          const staff = await getStaffMember(token.id);
          if (staff) {
            token.role = staff.role;
            token.organizationId = staff.organizationId;
            token.branchId = staff.branchId;
          } else {
            token.role = undefined;
            token.organizationId = undefined;
            token.branchId = undefined;
          }
        } catch (err) {
          console.error("[NextAuth] jwt callback error fetching staff:", err);
        }
      }

      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.organizationId = token.organizationId;
        session.user.branchId = token.branchId;
      }
      return session;
    },

    async redirect({ url, baseUrl }) {
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      if (new URL(url).origin === baseUrl) return url;
      return baseUrl;
    },
  },
};
