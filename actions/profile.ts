"use server";

import { HistoryActionType, HistoryObjectType, NotificationChannel } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { safeCreateHistory } from "@/lib/action-history";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getAppDefaultTimeZone, isValidIanaTimeZone } from "@/lib/timezone";

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
  timezone: z.string().trim().min(1, "Fuseau horaire requis."),
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

  const timezone = parsed.data.timezone;
  if (!isValidIanaTimeZone(timezone)) {
    return { success: false, message: "Fuseau horaire invalide." };
  }

  await prisma.$transaction(async (tx) => {
    await tx.userNotificationPreference.upsert({
      where: { userId: session.user.id },
      create: {
        userId: session.user.id,
        birthdaysChannel: parsed.data.birthdaysChannel,
        upcomingEventsChannel: parsed.data.upcomingEventsChannel,
        rsvpMissingChannel: parsed.data.rsvpMissingChannel,
        urgentItemsChannel: parsed.data.urgentItemsChannel,
        newMessagesChannel: parsed.data.newMessagesChannel,
      },
      update: {
        birthdaysChannel: parsed.data.birthdaysChannel,
        upcomingEventsChannel: parsed.data.upcomingEventsChannel,
        rsvpMissingChannel: parsed.data.rsvpMissingChannel,
        urgentItemsChannel: parsed.data.urgentItemsChannel,
        newMessagesChannel: parsed.data.newMessagesChannel,
      },
    });

    await tx.user.update({
      where: { id: session.user.id },
      data: {
        timezone: timezone || getAppDefaultTimeZone(),
      },
    });
  });

  revalidatePath("/parametres");
  return { success: true, message: "Preferences enregistrees." };
}

const managedFamilyMemberSchema = z.object({
  firstName: z.string().trim().min(2, "Prenom requis."),
  lastName: z.string().trim().max(80).optional(),
  relationLabel: z.string().trim().max(40).optional(),
  birthDate: z.union([birthDateSchema, z.literal("")]).optional(),
  phone: z.string().trim().max(30).optional(),
  address: z.string().trim().max(200).optional(),
  allergies: z.string().trim().max(400).optional(),
  foodPreferences: z.string().trim().max(400).optional(),
  giftIdeas: z.string().trim().max(400).optional(),
});

const updateManagedFamilyMemberSchema = managedFamilyMemberSchema.extend({
  memberId: z.string().min(1),
});

const deleteManagedFamilyMemberSchema = z.object({
  memberId: z.string().min(1),
});

export async function createManagedFamilyMemberAction(input: z.infer<typeof managedFamilyMemberSchema>) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, message: "Session invalide." };
  }

  const parsed = managedFamilyMemberSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0]?.message ?? "Membre invalide." };
  }

  const data = parsed.data;
  const birthDate = parseBirthDate(data.birthDate);

  const created = await prisma.$transaction(async (tx) => {
    const item = await tx.managedFamilyMember.create({
      data: {
        ownerUserId: session.user.id,
        firstName: data.firstName,
        lastName: data.lastName || null,
        relationLabel: data.relationLabel || null,
        birthDate,
        phone: data.phone || null,
        address: data.address || null,
        allergies: data.allergies || null,
        foodPreferences: data.foodPreferences || null,
        giftIdeas: data.giftIdeas || null,
      },
    });

    await safeCreateHistory(tx, {
      data: {
        actionType: HistoryActionType.CREATE,
        objectType: HistoryObjectType.MEMBER,
        objectId: item.id,
        objectLabel: `${item.firstName}${item.lastName ? ` ${item.lastName}` : ""}`.trim(),
        actorUserId: session.user.id,
        actorDisplayName: session.user.name ?? null,
        details: {
          source: "PROFILE",
        },
      },
    });

    return item;
  });

  revalidatePath("/profil");
  return { success: true, memberId: created.id, message: "Membre ajoute." };
}

export async function updateManagedFamilyMemberAction(input: z.infer<typeof updateManagedFamilyMemberSchema>) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, message: "Session invalide." };
  }

  const parsed = updateManagedFamilyMemberSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0]?.message ?? "Membre invalide." };
  }

  const existing = await prisma.managedFamilyMember.findUnique({
    where: { id: parsed.data.memberId },
  });

  if (!existing || existing.ownerUserId !== session.user.id) {
    return { success: false, message: "Acces refuse." };
  }

  const data = parsed.data;
  const birthDate = parseBirthDate(data.birthDate);

  await prisma.$transaction(async (tx) => {
    const updated = await tx.managedFamilyMember.update({
      where: { id: existing.id },
      data: {
        firstName: data.firstName,
        lastName: data.lastName || null,
        relationLabel: data.relationLabel || null,
        birthDate,
        phone: data.phone || null,
        address: data.address || null,
        allergies: data.allergies || null,
        foodPreferences: data.foodPreferences || null,
        giftIdeas: data.giftIdeas || null,
      },
    });

    await safeCreateHistory(tx, {
      data: {
        actionType: HistoryActionType.UPDATE,
        objectType: HistoryObjectType.MEMBER,
        objectId: updated.id,
        objectLabel: `${updated.firstName}${updated.lastName ? ` ${updated.lastName}` : ""}`.trim(),
        actorUserId: session.user.id,
        actorDisplayName: session.user.name ?? null,
        previousValue: {
          firstName: existing.firstName,
          lastName: existing.lastName,
          relationLabel: existing.relationLabel,
          birthDate: existing.birthDate,
          phone: existing.phone,
          address: existing.address,
          allergies: existing.allergies,
          foodPreferences: existing.foodPreferences,
          giftIdeas: existing.giftIdeas,
        },
        newValue: {
          firstName: updated.firstName,
          lastName: updated.lastName,
          relationLabel: updated.relationLabel,
          birthDate,
          phone: data.phone,
          address: data.address,
          allergies: data.allergies,
          foodPreferences: data.foodPreferences,
          giftIdeas: data.giftIdeas,
        },
      },
    });
  });

  revalidatePath("/profil");
  revalidatePath(`/profil/membre/${existing.id}`);
  return { success: true, message: "Membre mis a jour." };
}

export async function deleteManagedFamilyMemberAction(input: z.infer<typeof deleteManagedFamilyMemberSchema>) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, message: "Session invalide." };
  }

  const parsed = deleteManagedFamilyMemberSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, message: "Suppression invalide." };
  }

  const existing = await prisma.managedFamilyMember.findUnique({
    where: { id: parsed.data.memberId },
  });

  if (!existing || existing.ownerUserId !== session.user.id) {
    return { success: false, message: "Acces refuse." };
  }

  await prisma.$transaction(async (tx) => {
    await tx.managedFamilyMember.delete({ where: { id: existing.id } });

    await safeCreateHistory(tx, {
      data: {
        actionType: HistoryActionType.DELETE,
        objectType: HistoryObjectType.MEMBER,
        objectId: existing.id,
        objectLabel: `${existing.firstName}${existing.lastName ? ` ${existing.lastName}` : ""}`.trim(),
        actorUserId: session.user.id,
        actorDisplayName: session.user.name ?? null,
        previousValue: {
          firstName: existing.firstName,
          lastName: existing.lastName,
          relationLabel: existing.relationLabel,
        },
      },
    });
  });

  revalidatePath("/profil");
  return { success: true, message: "Membre supprime." };
}
