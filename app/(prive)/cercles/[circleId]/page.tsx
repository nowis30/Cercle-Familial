import Link from "next/link";
import { redirect } from "next/navigation";

import { CircleChat } from "@/components/chat/circle-chat";
import { CreateInviteForm } from "@/components/circles/create-invite-form";
import { EventCard } from "@/components/events/event-card";
import { AppShell } from "@/components/layout/app-shell";
import { Card } from "@/components/ui/card";
import { auth } from "@/lib/auth";
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
      <div className="grid grid-cols-2 gap-2 text-sm">
        <Link href={`/cercles/${circleId}/calendrier`} className="rounded-xl border border-zinc-200 bg-white px-3 py-2">
          Calendrier
        </Link>
        <Link href={`/cercles/${circleId}/membres`} className="rounded-xl border border-zinc-200 bg-white px-3 py-2">
          Membres
        </Link>
        <Link href={`/cercles/${circleId}/discussion`} className="rounded-xl border border-zinc-200 bg-white px-3 py-2">
          Discussion
        </Link>
        <Link href={`/cercles/${circleId}/evenements/nouveau`} className="rounded-xl border border-zinc-200 bg-white px-3 py-2">
          Nouvel evenement
        </Link>
      </div>
      <CreateInviteForm circleId={circleId} />

      <Card>
        <p className="mb-2 text-sm font-medium">Evenements recents</p>
        <div className="space-y-2">
          {events.map((event) => (
            <EventCard
              key={event.id}
              circleId={circleId}
              event={{
                id: event.id,
                title: event.title,
                type: event.type,
                startsAt: new Date(event.startsAt).toLocaleString("fr-CA"),
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
