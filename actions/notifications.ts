"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { auth } from "@/lib/auth";
import { syncAppNotificationsForUser } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";

const markAsReadSchema = z.object({
  notificationId: z.string().min(1),
});

export async function markNotificationReadAction(input: z.infer<typeof markAsReadSchema>) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, message: "Session invalide." };
  }

  const parsed = markAsReadSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, message: "Requete invalide." };
  }

  const notification = await prisma.appNotification.findUnique({
    where: { id: parsed.data.notificationId },
    select: { id: true, userId: true, isRead: true },
  });

  if (!notification || notification.userId !== session.user.id) {
    return { success: false, message: "Notification introuvable." };
  }

  if (!notification.isRead) {
    await prisma.appNotification.update({
      where: { id: notification.id },
      data: { isRead: true, readAt: new Date() },
    });
  }

  revalidatePath("/notifications");
  revalidatePath("/tableau-de-bord");
  revalidatePath("/parametres");
  return { success: true };
}

export async function markAllNotificationsReadAction() {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, message: "Session invalide." };
  }

  await prisma.appNotification.updateMany({
    where: {
      userId: session.user.id,
      isRead: false,
    },
    data: {
      isRead: true,
      readAt: new Date(),
    },
  });

  revalidatePath("/notifications");
  revalidatePath("/tableau-de-bord");
  revalidatePath("/parametres");
  return { success: true };
}

export async function refreshNotificationsAction() {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, message: "Session invalide." };
  }

  await syncAppNotificationsForUser(session.user.id);

  revalidatePath("/notifications");
  revalidatePath("/tableau-de-bord");
  return { success: true };
}
