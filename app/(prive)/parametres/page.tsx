import { redirect } from "next/navigation";

import { AppShell } from "@/components/layout/app-shell";
import { NotificationPreferencesForm } from "@/components/settings/notification-preferences-form";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function ParametresPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/connexion");
  }

  const prefs = await prisma.userNotificationPreference.findUnique({
    where: { userId: session.user.id },
  });

  return (
    <AppShell title="Parametres">
      <NotificationPreferencesForm
        initialValues={{
          birthdaysChannel: prefs?.birthdaysChannel ?? "APP",
          upcomingEventsChannel: prefs?.upcomingEventsChannel ?? "APP",
          rsvpMissingChannel: prefs?.rsvpMissingChannel ?? "NONE",
          urgentItemsChannel: prefs?.urgentItemsChannel ?? "NONE",
          newMessagesChannel: prefs?.newMessagesChannel ?? "APP",
        }}
      />
    </AppShell>
  );
}
