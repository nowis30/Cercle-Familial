import { NotificationChannel, Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

export type NotificationPreferenceValues = {
  birthdaysChannel: NotificationChannel;
  upcomingEventsChannel: NotificationChannel;
  rsvpMissingChannel: NotificationChannel;
  urgentItemsChannel: NotificationChannel;
  tasksOverdueChannel: NotificationChannel;
  newMessagesChannel: NotificationChannel;
};

function isMissingTasksOverdueColumnError(error: unknown) {
  const code = typeof error === "object" && error !== null && "code" in error ? String((error as { code?: string }).code) : "";
  const column =
    typeof error === "object" && error !== null && "meta" in error
      ? String((error as { meta?: { column?: string } }).meta?.column ?? "")
      : "";

  return code === "P2022" && column.includes("tasksOverdueChannel");
}

export function withNotificationPreferenceDefaults(prefs: Partial<NotificationPreferenceValues> | null): NotificationPreferenceValues {
  return {
    birthdaysChannel: prefs?.birthdaysChannel ?? NotificationChannel.APP,
    upcomingEventsChannel: prefs?.upcomingEventsChannel ?? NotificationChannel.APP,
    rsvpMissingChannel: prefs?.rsvpMissingChannel ?? NotificationChannel.NONE,
    urgentItemsChannel: prefs?.urgentItemsChannel ?? NotificationChannel.NONE,
    tasksOverdueChannel: prefs?.tasksOverdueChannel ?? NotificationChannel.APP,
    newMessagesChannel: prefs?.newMessagesChannel ?? NotificationChannel.APP,
  };
}

export async function getNotificationPreferencesSafe(userId: string) {
  try {
    return await prisma.userNotificationPreference.findUnique({
      where: { userId },
    });
  } catch (error) {
    if (isMissingTasksOverdueColumnError(error)) {
      console.warn("[notifications] Colonne tasksOverdueChannel absente, fallback temporaire active.");
      return null;
    }

    throw error;
  }
}

export async function upsertNotificationPreferencesSafe(
  tx: Prisma.TransactionClient,
  input: {
    userId: string;
    values: NotificationPreferenceValues;
  },
) {
  const dataWithTaskChannel = {
    birthdaysChannel: input.values.birthdaysChannel,
    upcomingEventsChannel: input.values.upcomingEventsChannel,
    rsvpMissingChannel: input.values.rsvpMissingChannel,
    urgentItemsChannel: input.values.urgentItemsChannel,
    tasksOverdueChannel: input.values.tasksOverdueChannel,
    newMessagesChannel: input.values.newMessagesChannel,
  };

  try {
    await tx.userNotificationPreference.upsert({
      where: { userId: input.userId },
      create: {
        userId: input.userId,
        ...dataWithTaskChannel,
      },
      update: dataWithTaskChannel,
    });
  } catch (error) {
    if (!isMissingTasksOverdueColumnError(error)) {
      throw error;
    }

    const dataWithoutTaskChannel = {
      birthdaysChannel: input.values.birthdaysChannel,
      upcomingEventsChannel: input.values.upcomingEventsChannel,
      rsvpMissingChannel: input.values.rsvpMissingChannel,
      urgentItemsChannel: input.values.urgentItemsChannel,
      newMessagesChannel: input.values.newMessagesChannel,
    };

    await tx.userNotificationPreference.upsert({
      where: { userId: input.userId },
      create: {
        userId: input.userId,
        ...dataWithoutTaskChannel,
      },
      update: dataWithoutTaskChannel,
    });
  }
}
