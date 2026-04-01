"use server";

import { NotificationChannel } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const profileSchema = z.object({
  firstName: z.string().trim().min(2, "Prenom requis"),
  lastName: z.string().trim().min(2, "Nom requis"),
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
    return { success: false, message: "Profil invalide.", issues: parsed.error.issues };
  }

  const data = parsed.data;
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
            allergies: data.allergies || null,
            foodPreferences: data.foodPreferences || null,
            giftIdeas: data.giftIdeas || null,
          },
          create: {
            firstName: data.firstName,
            lastName: data.lastName,
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
