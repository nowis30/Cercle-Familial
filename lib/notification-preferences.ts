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

type NotificationPreferenceRow = {
  birthdaysChannel: NotificationChannel;
  upcomingEventsChannel: NotificationChannel;
  rsvpMissingChannel: NotificationChannel;
  urgentItemsChannel: NotificationChannel;
  newMessagesChannel: NotificationChannel;
};

let hasTasksOverdueChannelPromise: Promise<boolean> | null = null;

async function hasTasksOverdueChannel(writer: typeof prisma | Prisma.TransactionClient) {
  if (writer === prisma) {
    hasTasksOverdueChannelPromise ??= readHasTasksOverdueChannel(prisma);
    return hasTasksOverdueChannelPromise;
  }

  return readHasTasksOverdueChannel(writer);
}

async function readHasTasksOverdueChannel(writer: typeof prisma | Prisma.TransactionClient) {
  const rows = await writer.$queryRaw<Array<{ exists: boolean }>>(Prisma.sql`
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'UserNotificationPreference'
        AND column_name = 'tasksOverdueChannel'
    ) AS "exists"
  `);

  return Boolean(rows[0]?.exists);
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
  if (await hasTasksOverdueChannel(prisma)) {
    return await prisma.userNotificationPreference.findUnique({
      where: { userId },
    });
  }

  const rows = await prisma.$queryRaw<NotificationPreferenceRow[]>(Prisma.sql`
    SELECT
      "birthdaysChannel",
      "upcomingEventsChannel",
      "rsvpMissingChannel",
      "urgentItemsChannel",
      "newMessagesChannel"
    FROM "UserNotificationPreference"
    WHERE "userId" = ${userId}
    LIMIT 1
  `);

  const prefs = rows[0];
  if (!prefs) {
    return null;
  }

  return {
    ...prefs,
    tasksOverdueChannel: NotificationChannel.APP,
  };
}

export async function upsertNotificationPreferencesSafe(
  tx: Prisma.TransactionClient,
  input: {
    userId: string;
    values: NotificationPreferenceValues;
  },
) {
  if (!(await hasTasksOverdueChannel(tx))) {
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

    return;
  }

  const dataWithTaskChannel = {
    birthdaysChannel: input.values.birthdaysChannel,
    upcomingEventsChannel: input.values.upcomingEventsChannel,
    rsvpMissingChannel: input.values.rsvpMissingChannel,
    urgentItemsChannel: input.values.urgentItemsChannel,
    tasksOverdueChannel: input.values.tasksOverdueChannel,
    newMessagesChannel: input.values.newMessagesChannel,
  };

  await tx.userNotificationPreference.upsert({
    where: { userId: input.userId },
    create: {
      userId: input.userId,
      ...dataWithTaskChannel,
    },
    update: dataWithTaskChannel,
  });
}
