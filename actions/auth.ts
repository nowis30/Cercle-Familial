"use server";

import bcrypt from "bcryptjs";
import { z } from "zod";

import { prisma } from "@/lib/prisma";

const registerSchema = z.object({
  name: z.string().trim().min(2, "Nom requis"),
  email: z.email("Courriel invalide"),
  password: z.string().min(8, "8 caracteres minimum"),
});

export async function registerUserAction(input: z.infer<typeof registerSchema>) {
  const parsed = registerSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, message: "Formulaire invalide.", issues: parsed.error.issues };
  }

  const data = parsed.data;
  const normalizedEmail = data.email.toLowerCase();
  const exists = await prisma.user.findUnique({ where: { email: normalizedEmail } });

  if (exists) {
    return { success: false, message: "Ce courriel est deja utilise." };
  }

  const [firstName, ...lastNameParts] = data.name.split(" ").filter(Boolean);
  const lastName = lastNameParts.join(" ") || firstName;
  const passwordHash = await bcrypt.hash(data.password, 10);

  await prisma.user.create({
    data: {
      name: data.name,
      email: normalizedEmail,
      passwordHash,
      isAdult: true,
      profile: {
        create: {
          firstName,
          lastName,
        },
      },
    },
  });

  return { success: true, message: "Compte cree. Vous pouvez maintenant vous connecter." };
}
