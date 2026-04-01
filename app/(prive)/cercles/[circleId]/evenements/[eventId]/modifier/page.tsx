import { redirect } from "next/navigation";

import { AppShell } from "@/components/layout/app-shell";
import { Card } from "@/components/ui/card";
import { CreateEventForm } from "@/components/events/create-event-form";
import { auth } from "@/lib/auth";
import { canManageCircle } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

function formatDateTimeLocal(value?: Date | null) {
  if (!value) return "";
  const date = new Date(value);
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const hh = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
}

export default async function ModifierEvenementPage({
  params,
}: {
  params: Promise<{ circleId: string; eventId: string }>;
}) {
  const { circleId, eventId } = await params;
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/connexion");
  }

  const [membership, event, circles] = await Promise.all([
    prisma.circleMembership.findUnique({
      where: {
        circleId_userId: {
          circleId,
          userId: session.user.id,
        },
      },
    }),
    prisma.event.findFirst({
      where: {
        id: eventId,
        circleId,
      },
      include: {
        invites: true,
      },
    }),
    prisma.circleMembership.findMany({
      where: {
        userId: session.user.id,
        role: { in: ["ADMIN", "ADULTE"] },
      },
      include: { circle: true },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  if (!membership || !event) {
    redirect(`/cercles/${circleId}`);
  }

  const canManageEvent = canManageCircle(membership.role) || event.hostId === session.user.id;
  if (!canManageEvent) {
    redirect(`/cercles/${circleId}/evenements/${eventId}`);
  }

  const members = await prisma.circleMembership.findMany({
    where: { circleId: event.circleId },
    include: { user: true },
    orderBy: { createdAt: "asc" },
  });

  return (
    <AppShell title="Modifier evenement">
      <Card className="bg-gradient-to-br from-white to-amber-50/60">
        <p className="font-serif text-lg font-bold text-zinc-900">Modifier l&apos;evenement</p>
        <p className="mt-1 text-sm text-zinc-600">Ajustez les informations sans perdre les donnees deja saisies.</p>
      </Card>
      <CreateEventForm
        mode="edit"
        eventId={event.id}
        circleId={event.circleId}
        availableCircles={circles.map((entry) => ({ id: entry.circle.id, name: entry.circle.name }))}
        members={members.map((member) => ({ id: member.userId, name: member.user.name }))}
        initialValues={{
          circleId: event.circleId,
          title: event.title,
          type: event.type,
          startsAt: formatDateTimeLocal(event.startsAt),
          endsAt: formatDateTimeLocal(event.endsAt),
          locationName: event.locationName,
          address: event.address ?? "",
          description: event.description ?? "",
          invitedUserIds: event.invites.map((invite) => invite.userId),
        }}
      />
    </AppShell>
  );
}
