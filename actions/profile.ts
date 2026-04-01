"use server";

import { NotificationChannel } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function isValidDateInput(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  const candidate = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));

  return (
    Number.isFinite(candidate.getTime()) &&
    candidate.getUTCFullYear() === year &&
    candidate.getUTCMonth() === month - 1 &&
    candidate.getUTCDate() === day
  );
}

function parseBirthDate(value?: string) {
  if (!value) return null;

  const [year, month, day] = value.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
}

const birthDateSchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date de naissance invalide.")
  .refine((value) => isValidDateInput(value), "Date de naissance invalide.");

const profileSchema = z.object({
  firstName: z.string().trim().min(2, "Prenom requis"),
  lastName: z.string().trim().min(2, "Nom requis"),
  birthDate: z.union([birthDateSchema, z.literal("")]).optional(),
  phone: z.string().trim().max(30).optional(),
  address: z.string().trim().max(200).optional(),
  allergies: z.string().trim().max(400).optional(),
  foodPreferences: z.string().trim().max(400).optional(),
  giftIdeas: z.string().trim().max(400).optional(),
});

export async function updateProfileAction(input: z.infer<typeof profileSchema>) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, message: "Session invalide." };
  }

  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? "Profil invalide.",
      issues: parsed.error.issues,
    };
  }

  const data = parsed.data;
  const birthDate = parseBirthDate(data.birthDate);

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      name: `${data.firstName} ${data.lastName}`,
      phone: data.phone || null,
      address: data.address || null,
      profile: {
        upsert: {
          update: {
            firstName: data.firstName,
            lastName: data.lastName,
            birthDate,
            allergies: data.allergies || null,
            foodPreferences: data.foodPreferences || null,
            giftIdeas: data.giftIdeas || null,
          },
          create: {
            firstName: data.firstName,
            lastName: data.lastName,
            birthDate,
            allergies: data.allergies || null,
            foodPreferences: data.foodPreferences || null,
            giftIdeas: data.giftIdeas || null,
          },
        },
      },
    },
  });

  revalidatePath("/profil");
  return { success: true, message: "Profil mis a jour." };
}

const notificationSchema = z.object({
  birthdaysChannel: z.nativeEnum(NotificationChannel),
  upcomingEventsChannel: z.nativeEnum(NotificationChannel),
  rsvpMissingChannel: z.nativeEnum(NotificationChannel),
  urgentItemsChannel: z.nativeEnum(NotificationChannel),
  newMessagesChannel: z.nativeEnum(NotificationChannel),
});

export async function updateNotificationPreferencesAction(input: z.infer<typeof notificationSchema>) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, message: "Session invalide." };
  }

  const parsed = notificationSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, message: "Preferences invalides." };
  }

  await prisma.userNotificationPreference.upsert({
    where: { userId: session.user.id },
    create: {
      userId: session.user.id,
      ...parsed.data,
    },
    update: parsed.data,
  });

  revalidatePath("/parametres");
  return { success: true, message: "Preferences enregistrees." };
}
