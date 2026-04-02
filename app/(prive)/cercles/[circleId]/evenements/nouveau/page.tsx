import { redirect } from "next/navigation";

import { CreateEventForm } from "@/components/events/create-event-form";
import { AppShell } from "@/components/layout/app-shell";
import { Card } from "@/components/ui/card";
import { auth } from "@/lib/auth";
import { toEventDateTimeLocalValue } from "@/lib/event-datetime";
import { canCreateEvent } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { getEffectiveTimeZone } from "@/lib/timezone";

export default async function NouvelEvenementPage({
  params,
  searchParams,
}: {
  params: Promise<{ circleId: string }>;
  searchParams: Promise<{ date?: string; duplicateFrom?: string }>;
}) {
  const { circleId } = await params;
  const { date, duplicateFrom } = await searchParams;
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/connexion");
  }

  const [membership, user] = await Promise.all([
    prisma.circleMembership.findUnique({
      where: {
        circleId_userId: {
          circleId,
          userId: session.user.id,
        },
      },
    }),
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { timezone: true },
    }),
  ]);

  if (!membership || !canCreateEvent(membership.role)) {
    redirect(`/cercles/${circleId}`);
  }

  const effectiveTimeZone = getEffectiveTimeZone(user?.timezone);

  const duplicatedEvent = duplicateFrom
    ? await prisma.event.findFirst({
        where: {
          id: duplicateFrom,
          circleId,
        },
        include: {
          invites: true,
        },
      })
    : null;

  const members = await prisma.circleMembership.findMany({
    where: { circleId },
    include: { user: true },
    orderBy: { createdAt: "asc" },
  });

  const initialStartsAt = date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? `${date}T18:00` : undefined;

  return (
    <AppShell title="Nouvel evenement">
      <Card className="bg-gradient-to-br from-white to-amber-50/60">
        <p className="font-serif text-lg font-bold text-zinc-900">
          {duplicatedEvent ? "Dupliquer un evenement" : "Organiser un nouvel evenement"}
        </p>
        <p className="mt-1 text-sm text-zinc-600">
          {duplicatedEvent
            ? "Reutilisez un evenement existant comme base, puis ajustez les details avant publication."
            : "Creez un rendez-vous clair avec invites, lieu, date et details utiles."}
        </p>
      </Card>
      <CreateEventForm
        circleId={circleId}
        initialStartsAt={initialStartsAt}
        effectiveTimeZone={effectiveTimeZone}
        initialValues={
          duplicatedEvent
            ? {
                circleId,
                title: `${duplicatedEvent.title} (copie)`,
                type: duplicatedEvent.type,
                startsAt: toEventDateTimeLocalValue(duplicatedEvent.startsAt, effectiveTimeZone),
                endsAt: toEventDateTimeLocalValue(duplicatedEvent.endsAt, effectiveTimeZone),
                locationName: duplicatedEvent.locationName,
                address: duplicatedEvent.address ?? "",
                description: duplicatedEvent.description ?? "",
                invitedUserIds: duplicatedEvent.invites.map((invite) => invite.userId),
              }
            : undefined
        }
        members={members.map((member) => ({
          id: member.userId,
          name: member.user.name,
        }))}
      />
    </AppShell>
  );
}
