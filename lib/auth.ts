import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { CircleRole } from "@prisma/client";
import bcrypt from "bcryptjs";
import { createHash } from "node:crypto";
import type { NextAuthOptions } from "next-auth";
import { getServerSession } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { z } from "zod";

import { resolveAuthConfiguration } from "@/lib/auth-config";
import { prisma } from "@/lib/prisma";
const authConfiguration = resolveAuthConfiguration(process.env);

if (authConfiguration.normalizedAuthUrl) {
  process.env.NEXTAUTH_URL = authConfiguration.normalizedAuthUrl;
}

for (const warning of authConfiguration.warnings) {
  console.warn(warning);
}

const loginSchema = z.object({
  email: z.email("Courriel invalide"),
  password: z.string().min(8, "Mot de passe trop court"),
});

const providers: NextAuthOptions["providers"] = [
  CredentialsProvider({
    name: "Courriel",
    credentials: {
      email: { label: "Courriel", type: "email" },
      password: { label: "Mot de passe", type: "password" },
    },
    async authorize(credentials) {
      const parsed = loginSchema.safeParse(credentials);
      if (!parsed.success) {
        return null;
      }

      const user = await prisma.user.findUnique({
        where: { email: parsed.data.email.toLowerCase() },
        include: {
          circleMemberships: {
            orderBy: { createdAt: "asc" },
            take: 1,
          },
        },
      });

      if (!user?.passwordHash) {
        return null;
      }

      const isValid = await bcrypt.compare(parsed.data.password, user.passwordHash);
      if (!isValid) {
        return null;
      }

      return {
        id: user.id,
        email: user.email,
        name: user.name,
        image: user.image,
        defaultCircleRole: user.circleMemberships[0]?.role ?? CircleRole.ENFANT,
      };
    },
  }),
];

if (authConfiguration.hasGoogleProviderConfig) {
  providers.push(
    GoogleProvider({
      clientId: authConfiguration.googleClientId!,
      clientSecret: authConfiguration.googleClientSecret!,
    }),
  );
}

const authSecret =
  authConfiguration.authSecret ??
  (process.env.DATABASE_URL
    ? createHash("sha256").update(process.env.DATABASE_URL).digest("hex")
    : "cercle-familial-fallback-secret");

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  secret: authSecret,
  pages: {
    signIn: "/connexion",
  },
  providers,
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.defaultCircleRole = (user as { defaultCircleRole?: CircleRole }).defaultCircleRole;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.defaultCircleRole = token.defaultCircleRole as CircleRole | undefined;
      }
      return session;
    },
  },
};

export function auth() {
  return getServerSession(authOptions);
}
