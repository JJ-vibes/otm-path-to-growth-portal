import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        try {
          const user = await prisma.user.findUnique({
            where: { email: credentials.email },
          });

          if (!user) return null;

          if (!user.active) {
            throw new Error("Account deactivated. Contact your OTM administrator.");
          }

          const isValid = await bcrypt.compare(
            credentials.password,
            user.passwordHash
          );

          if (!isValid) return null;

          // Update last login timestamp (best-effort, non-blocking).
          prisma.user
            .update({ where: { id: user.id }, data: { lastLoginAt: new Date() } })
            .catch((err) => console.warn("[AUTH] lastLoginAt update failed:", err));

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
          };
        } catch (error) {
          console.error("[AUTH] Error:", error);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role: "ADMIN" | "CLIENT" }).role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as { id: string }).id = token.id as string;
        (session.user as { role: string }).role = token.role as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET || "yt25dlXDIOZmtCV0rZXO/VPFc9B3UhQ/8pLW2UCezt8=",
};
