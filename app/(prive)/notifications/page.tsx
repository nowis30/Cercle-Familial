import { redirect } from "next/navigation";

import { NotificationsCenter } from "@/components/notifications/notifications-center";
import { AppShell } from "@/components/layout/app-shell";
import { auth } from "@/lib/auth";
import { syncAppNotificationsForUser } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";

export default async function NotificationsPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/connexion");
  }

  await syncAppNotificationsForUser(session.user.id);

  const [unreadCount, notifications] = await Promise.all([
    prisma.appNotification.count({
      where: {
        userId: session.user.id,
        isRead: false,
      },
    }),
    prisma.appNotification.findMany({
      where: { userId: session.user.id },
      orderBy: [{ isRead: "asc" }, { createdAt: "desc" }],
      take: 80,
    }),
  ]);

  return (
    <AppShell title="Notifications">
      <NotificationsCenter
        unreadCount={unreadCount}
        notifications={notifications.map((item) => ({
          id: item.id,
          title: item.title,
          message: item.message,
          href: item.href,
          isRead: item.isRead,
          createdAtLabel: new Intl.DateTimeFormat("fr-CA", {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          }).format(item.createdAt),
        }))}
      />
    </AppShell>
  );
}
