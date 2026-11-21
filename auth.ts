import NextAuth, { type DefaultSession } from "next-auth";
import type { Adapter } from "next-auth/adapters";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { getDb } from "@/lib/db";
import { accounts, users } from "@/lib/db/schema";
import { claimPendingShares, verifyCredentials } from "@/lib/services/users";
import { emailSchema } from "@/lib/validation";

declare module "next-auth" {
  interface Session {
    user: { id: string; email: string } & DefaultSession["user"];
  }
}

/** Adapter wrapper that keeps emails normalized (trimmed + lowercased) for OAuth users too. */
function normalizedAdapter(): Adapter {
  const base = DrizzleAdapter(getDb(), { usersTable: users, accountsTable: accounts });
  return {
    ...base,
    createUser: (u) => base.createUser!({ ...u, email: u.email.trim().toLowerCase() }),
    getUserByEmail: (email) => base.getUserByEmail!(email.trim().toLowerCase()),
  };
}

export const { handlers, auth, signIn, signOut } = NextAuth(() => ({
  adapter: normalizedAdapter(),
  // Credentials provider requires JWT sessions (see decisions.md D-011).
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    Google({
      // Safe: Google verifies email ownership, so linking a Google sign-in to an
      // existing password account with the same email can't be used for takeover.
      allowDangerousEmailAccountLinking: true,
    }),
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(raw) {
        const email = emailSchema.safeParse(raw?.email);
        const password = typeof raw?.password === "string" ? raw.password : "";
        if (!email.success || !password) return null;
        return verifyCredentials(getDb(), email.data, password);
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user?.id) {
        token.id = user.id;
        if (user.email) token.email = user.email.toLowerCase();
      }
      return token;
    },
    session({ session, token }) {
      if (token.id) session.user.id = token.id as string;
      if (token.email) session.user.email = token.email;
      return session;
    },
  },
  events: {
    async signIn({ user }) {
      if (user.id && user.email) await claimPendingShares(getDb(), user.id, user.email);
    },
  },
}));
