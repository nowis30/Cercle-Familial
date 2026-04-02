import { AppNotificationType, NotificationChannel, type Prisma } from "@prisma/client";

import { getNotificationPreferencesSafe, withNotificationPreferenceDefaults } from "@/lib/notification-preferences";
import { prisma } from "@/lib/prisma";

type ReminderInput = {
  userId: string;
  type: AppNotificationType;
  title: string;
  message: string;
  href?: string;
  triggerKey: string;
};

async function upsertReminder(tx: Prisma.TransactionClient, reminder: ReminderInput) {
  await tx.appNotification.upsert({
    where: { triggerKey: reminder.triggerKey },
    create: {
      userId: reminder.userId,
      type: reminder.type,
      title: reminder.title,
      message: reminder.message,
      href: reminder.href ?? null,
      triggerKey: reminder.triggerKey,
    },
    update: {
      title: reminder.title,
      message: reminder.message,
      href: reminder.href ?? null,
    },
  });
}

export async function syncAppNotificationsForUser(userId: string) {
  const [prefs, memberships] = await Promise.all([
    getNotificationPreferencesSafe(userId),
    prisma.circleMembership.findMany({ where: { userId }, select: { circleId: true } }),
  ]);

  const channels = withNotificationPreferenceDefaults(prefs);
  const circleIds = memberships.map((membership) => membership.circleId);

  if (circleIds.length === 0) {
    return { createdOrUpdated: 0 };
  }

  const now = new Date();
  const in48Hours = new Date(now.getTime() + 48 * 60 * 60 * 1000);
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

  const [profiles, managedMembers, eventsSoon, urgentItems, overdueTasks, newMessages] = await Promise.all([
    channels.birthdaysChannel === NotificationChannel.APP
      ? prisma.personProfile.findMany({
          where: {
            birthDate: { not: null },
            user: {
              circleMemberships: {
                some: { circleId: { in: circleIds } },
              },
            },
          },
          take: 200,
        })
      : Promise.resolve([]),
    channels.birthdaysChannel === NotificationChannel.APP
      ? prisma.managedFamilyMember.findMany({
          where: {
            birthDate: { not: null },
            owner: {
              circleMemberships: {
                some: { circleId: { in: circleIds } },
              },
            },
          },
          take: 200,
        })
      : Promise.resolve([]),
    channels.upcomingEventsChannel === NotificationChannel.APP || channels.rsvpMissingChannel === NotificationChannel.APP
      ? prisma.event.findMany({
          where: {
            circleId: { in: circleIds },
            startsAt: { gte: now, lte: in48Hours },
          },
          include: {
            invites: true,
            attendances: true,
          },
          orderBy: { startsAt: "asc" },
          take: 50,
        })
      : Promise.resolve([]),
    channels.urgentItemsChannel === NotificationChannel.APP
      ? prisma.eventContributionItem.findMany({
          where: {
            event: { circleId: { in: circleIds } },
            status: { in: ["URGENT", "MANQUANT"] },
          },
          include: {
            event: {
              select: {
                id: true,
                circleId: true,
                title: true,
              },
            },
          },
          orderBy: { updatedAt: "desc" },
          take: 50,
        })
      : Promise.resolve([]),
    channels.tasksOverdueChannel === NotificationChannel.APP
      ? prisma.sharedTask.findMany({
          where: {
            assigneeUserId: userId,
            status: { not: "TERMINE" },
            dueAt: { lt: now },
            circleId: { in: circleIds },
          },
          orderBy: { dueAt: "asc" },
          take: 50,
        })
      : Promise.resolve([]),
    channels.newMessagesChannel === NotificationChannel.APP
      ? prisma.circleMessage.findMany({
          where: {
            circleId: { in: circleIds },
            authorId: { not: userId },
            createdAt: { gte: yesterday },
          },
          include: {
            author: { select: { name: true } },
            circle: { select: { id: true, name: true } },
          },
          orderBy: { createdAt: "desc" },
          take: 30,
        })
      : Promise.resolve([]),
  ]);

  const reminders: ReminderInput[] = [];

  if (channels.birthdaysChannel === NotificationChannel.APP) {
    for (const profile of profiles) {
      if (!profile.birthDate) continue;
      const date = new Date(profile.birthDate);
      if (date.getMonth() !== tomorrow.getMonth() || date.getDate() !== tomorrow.getDate()) continue;

      reminders.push({
        userId,
        type: AppNotificationType.BIRTHDAY_TOMORROW,
        title: "Anniversaire demain",
        message: `Demain: anniversaire de ${profile.firstName} ${profile.lastName}.`,
        href: "/tableau-de-bord",
        triggerKey: `birthday:profile:${profile.id}:${tomorrow.toISOString().slice(0, 10)}`,
      });
    }

    for (const member of managedMembers) {
      if (!member.birthDate) continue;
      const date = new Date(member.birthDate);
      if (date.getMonth() !== tomorrow.getMonth() || date.getDate() !== tomorrow.getDate()) continue;

      reminders.push({
        userId,
        type: AppNotificationType.BIRTHDAY_TOMORROW,
        title: "Anniversaire demain",
        message: `Demain: anniversaire de ${member.firstName}${member.lastName ? ` ${member.lastName}` : ""}.`,
        href: "/tableau-de-bord",
        triggerKey: `birthday:managed:${member.id}:${tomorrow.toISOString().slice(0, 10)}`,
      });
    }
  }

  if (channels.upcomingEventsChannel === NotificationChannel.APP) {
    for (const event of eventsSoon) {
      reminders.push({
        userId,
        type: AppNotificationType.EVENT_SOON,
        title: "Evenement bientot",
        message: `${event.title} commence bientot.`,
        href: `/cercles/${event.circleId}/evenements/${event.id}`,
        triggerKey: `event-soon:${event.id}`,
      });
    }
  }

  if (channels.rsvpMissingChannel === NotificationChannel.APP) {
    for (const event of eventsSoon) {
      const invited = event.invites.some((invite) => invite.userId === userId);
      const answered = event.attendances.some((attendance) => attendance.userId === userId);
      if (!invited || answered) continue;

      reminders.push({
        userId,
        type: AppNotificationType.RSVP_MISSING,
        title: "RSVP en attente",
        message: `Tu dois repondre pour ${event.title}.`,
        href: `/cercles/${event.circleId}/evenements/${event.id}`,
        triggerKey: `rsvp-missing:${event.id}:${userId}`,
      });
    }
  }

  if (channels.urgentItemsChannel === NotificationChannel.APP) {
    for (const item of urgentItems) {
      reminders.push({
        userId,
        type: AppNotificationType.URGENT_ITEM,
        title: "Item urgent ou manquant",
        message: `${item.name} (${item.status}) pour ${item.event.title}.`,
        href: `/cercles/${item.event.circleId}/evenements/${item.event.id}`,
        triggerKey: `urgent-item:${item.id}:${item.status}`,
      });
    }
  }

  if (channels.tasksOverdueChannel === NotificationChannel.APP) {
    for (const task of overdueTasks) {
      reminders.push({
        userId,
        type: AppNotificationType.TASK_OVERDUE,
        title: "Tache en retard",
        message: `${task.title} est en retard.`,
        href: `/cercles/${task.circleId}/taches`,
        triggerKey: `task-overdue:${task.id}`,
      });
    }
  }

  if (channels.newMessagesChannel === NotificationChannel.APP) {
    for (const message of newMessages) {
      reminders.push({
        userId,
        type: AppNotificationType.NEW_MESSAGE,
        title: "Nouveau message",
        message: `${message.author.name}: ${message.content.slice(0, 70)}`,
        href: `/cercles/${message.circle.id}/discussion`,
        triggerKey: `new-message:${message.id}`,
      });
    }
  }

  await prisma.$transaction(async (tx) => {
    for (const reminder of reminders) {
      await upsertReminder(tx, reminder);
    }

    const dynamicTypes: AppNotificationType[] = [
      AppNotificationType.BIRTHDAY_TOMORROW,
      AppNotificationType.EVENT_SOON,
      AppNotificationType.RSVP_MISSING,
      AppNotificationType.URGENT_ITEM,
      AppNotificationType.TASK_OVERDUE,
    ];

    const dynamicKeys = reminders
      .filter((item) => dynamicTypes.includes(item.type))
      .map((item) => item.triggerKey);

    await tx.appNotification.deleteMany({
      where: {
        userId,
        type: { in: dynamicTypes },
        triggerKey: dynamicKeys.length > 0 ? { notIn: dynamicKeys } : undefined,
      },
    });

    await tx.appNotification.deleteMany({
      where: {
        userId,
        type: AppNotificationType.NEW_MESSAGE,
        createdAt: { lt: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000) },
      },
    });
  });

  return { createdOrUpdated: reminders.length };
}
