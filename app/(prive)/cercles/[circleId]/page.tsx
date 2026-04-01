import Link from "next/link";
import { redirect } from "next/navigation";

import { CircleChat } from "@/components/chat/circle-chat";
import { CircleManagementActions } from "@/components/circles/circle-management-actions";
import { CreateInviteForm } from "@/components/circles/create-invite-form";
import { EventCard } from "@/components/events/event-card";
import { AppShell } from "@/components/layout/app-shell";
import { Card } from "@/components/ui/card";
import { auth } from "@/lib/auth";
import { formatEventDateTime } from "@/lib/event-datetime";
import { canManageCircle } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export default async function CircleDetailPage({ params }: { params: Promise<{ circleId: string }> }) {
  const { circleId } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/connexion");
  }

  const membership = await prisma.circleMembership.findUnique({
    where: {
      circleId_userId: {
        circleId,
        userId: session.user.id,
      },
    },
    include: { circle: true },
  });

  if (!membership) {
    redirect("/cercles");
  }

  const events = await prisma.event.findMany({
    where: { circleId },
    orderBy: { startsAt: "asc" },
    take: 8,
  });

  const messages = await prisma.circleMessage.findMany({
    where: { circleId },
    orderBy: { createdAt: "desc" },
    include: { author: true },
    take: 12,
  });

  return (
    <AppShell title={membership.circle.name}>
      <Card className="bg-gradient-to-br from-white to-indigo-50/50">
        <p className="font-serif text-lg font-bold text-zinc-900">{membership.circle.name}</p>
        {membership.circle.description ? <p className="mt-1 text-sm text-zinc-600">{membership.circle.description}</p> : null}
        <div className="mt-3">
          <CircleManagementActions
            circleId={circleId}
            circleName={membership.circle.name}
            canManage={canManageCircle(membership.role)}
          />
        </div>
      </Card>
      <div className="grid grid-cols-2 gap-2 text-sm">
        <Link href={`/cercles/${circleId}/calendrier`} className="rounded-2xl border border-indigo-100 bg-indigo-50/70 px-3 py-3 font-semibold text-indigo-800 transition-colors hover:bg-indigo-100">
          Calendrier
        </Link>
        <Link href={`/cercles/${circleId}/membres`} className="rounded-2xl border border-zinc-200 bg-white px-3 py-3 font-semibold text-zinc-700 transition-colors hover:bg-zinc-50">
          Membres
        </Link>
        <Link href={`/cercles/${circleId}/discussion`} className="rounded-2xl border border-zinc-200 bg-white px-3 py-3 font-semibold text-zinc-700 transition-colors hover:bg-zinc-50">
          Discussion
        </Link>
        <Link href={`/cercles/${circleId}/evenements/nouveau`} className="rounded-2xl border border-zinc-200 bg-white px-3 py-3 font-semibold text-zinc-700 transition-colors hover:bg-zinc-50">
          Nouvel evenement
        </Link>
      </div>
      <CreateInviteForm circleId={circleId} />

      <Card>
        <p className="mb-2 font-serif text-lg font-bold text-zinc-900">Evenements recents</p>
        <div className="space-y-2">
          {events.length === 0 ? <p className="rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-3 text-sm text-zinc-600">Aucun evenement pour le moment.</p> : null}
          {events.map((event) => (
            <EventCard
              key={event.id}
              circleId={circleId}
              event={{
                id: event.id,
                title: event.title,
                type: event.type,
                startsAt: formatEventDateTime(event.startsAt),
                endsAt: event.endsAt ? formatEventDateTime(event.endsAt) : undefined,
                locationName: event.locationName,
              }}
            />
          ))}
        </div>
      </Card>

      <CircleChat
        messages={messages.map((message) => ({
          id: message.id,
          author: message.author.name,
          content: message.content,
          at: new Date(message.createdAt).toLocaleTimeString("fr-CA", { hour: "2-digit", minute: "2-digit" }),
        }))}
      />
    </AppShell>
  );
}
