import { redirect } from "next/navigation";
import Link from "next/link";

import { AppShell } from "@/components/layout/app-shell";
import { NotificationPreferencesForm } from "@/components/settings/notification-preferences-form";
import { Card } from "@/components/ui/card";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getAppDefaultTimeZone, getEffectiveTimeZone, getTimeZoneOptions } from "@/lib/timezone";

export default async function ParametresPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/connexion");
  }

  const [prefs, user] = await Promise.all([
    prisma.userNotificationPreference.findUnique({
      where: { userId: session.user.id },
    }),
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { timezone: true },
    }),
  ]);

  const appDefaultTimeZone = getAppDefaultTimeZone();
  const effectiveTimeZone = getEffectiveTimeZone(user?.timezone);
  const timeZoneOptions = getTimeZoneOptions();

  return (
    <AppShell title="Parametres">
      <Card>
        <p className="text-sm font-semibold text-zinc-900">Securite et historique</p>
        <p className="mt-1 text-xs text-zinc-600">Consulte les creations, modifications, suppressions et retraits de membres.</p>
        <Link
          href="/historique"
          className="mt-3 inline-flex h-10 items-center justify-center rounded-xl border border-indigo-200 bg-indigo-50 px-4 text-sm font-semibold text-indigo-700 hover:bg-indigo-100"
        >
          Ouvrir l&apos;historique
        </Link>
      </Card>

      <NotificationPreferencesForm
        initialValues={{
          birthdaysChannel: prefs?.birthdaysChannel ?? "APP",
          upcomingEventsChannel: prefs?.upcomingEventsChannel ?? "APP",
          rsvpMissingChannel: prefs?.rsvpMissingChannel ?? "NONE",
          urgentItemsChannel: prefs?.urgentItemsChannel ?? "NONE",
          newMessagesChannel: prefs?.newMessagesChannel ?? "APP",
          timezone: effectiveTimeZone,
        }}
        timeZoneOptions={timeZoneOptions}
        appDefaultTimeZone={appDefaultTimeZone}
      />
    </AppShell>
  );
}
