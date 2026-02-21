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
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      // On initial sign-in, user object is available
      if (user) {
        token.id = user.id;
      }

      // Fetch staff role from DB on every token refresh
      if (token.id) {
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
      // If it's a relative URL or same origin, allow it
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      if (new URL(url).origin === baseUrl) return url;
      return baseUrl;
    },
  },
};
