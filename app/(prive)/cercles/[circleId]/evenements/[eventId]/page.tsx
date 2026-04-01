import { redirect } from "next/navigation";

import { EventCommentsPanel } from "@/components/events/event-comments-panel";
import { EventContributionsPanel } from "@/components/events/event-contributions-panel";
import { EventPhotosPanel } from "@/components/events/event-photos-panel";
import { RSVPForm } from "@/components/events/rsvp-form";
import { AppShell } from "@/components/layout/app-shell";
import { Card } from "@/components/ui/card";
import { auth } from "@/lib/auth";
import { canManageCircle } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export default async function EventDetailPage({ params }: { params: Promise<{ circleId: string; eventId: string }> }) {
  const { circleId, eventId } = await params;
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
  });
  if (!membership) {
    redirect("/cercles");
  }

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: {
      attendances: true,
      invites: true,
      contributionItems: {
        include: {
          reservedBy: true,
        },
        orderBy: { createdAt: "asc" },
      },
      comments: {
        include: { author: true },
        orderBy: { createdAt: "desc" },
      },
      photos: {
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!event || event.circleId !== circleId) {
    redirect(`/cercles/${circleId}`);
  }

  const myRsvp = event.attendances.find((attendance) => attendance.userId === session.user.id);
  const totalResponses = event.attendances.length;
  const totalPeople = event.attendances.reduce((sum, attendance) => sum + attendance.totalCount, 0);
  const totalAdults = event.attendances.reduce((sum, attendance) => sum + attendance.adultsCount, 0);
  const totalChildren = event.attendances.reduce((sum, attendance) => sum + attendance.childrenCount, 0);
  const missingResponses = Math.max(0, event.invites.length - totalResponses);

  return (
    <AppShell title={event.title}>
      <Card>
        <p className="text-sm text-zinc-600">{new Date(event.startsAt).toLocaleString("fr-CA")}</p>
        <p className="mt-1 text-sm text-zinc-700">Lieu: {event.locationName}</p>
        <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-zinc-600">
          <p>Reponses: {totalResponses}</p>
          <p>Personnes: {totalPeople}</p>
          <p>Adultes: {totalAdults}</p>
          <p>Enfants: {totalChildren}</p>
          <p>Manquantes: {missingResponses}</p>
        </div>
      </Card>
      <RSVPForm
        eventId={event.id}
        initial={
          myRsvp
            ? {
                response: myRsvp.response,
                adultsCount: myRsvp.adultsCount,
                childrenCount: myRsvp.childrenCount,
                guestsDisplayName: myRsvp.guestsDisplayName ?? "",
                note: myRsvp.note ?? "",
              }
            : undefined
        }
      />
      <Card>
        <p className="mb-2 text-sm font-medium">Qui apporte quoi</p>
        <EventContributionsPanel
          eventId={event.id}
          items={event.contributionItems.map((item) => ({
            id: item.id,
            name: item.name,
            quantity: item.quantity,
            note: item.note,
            status: item.status,
            reservedByName: item.reservedBy?.name,
          }))}
        />
      </Card>
      <Card>
        <p className="mb-2 text-sm font-medium">Commentaires</p>
        <EventCommentsPanel
          eventId={event.id}
          comments={event.comments.map((comment) => ({
            id: comment.id,
            author: comment.author.name,
            content: comment.content,
            at: new Date(comment.createdAt).toLocaleTimeString("fr-CA", { hour: "2-digit", minute: "2-digit" }),
            canDelete: canManageCircle(membership.role),
          }))}
        />
      </Card>
      <Card>
        <p className="mb-2 text-sm font-medium">Photos souvenirs</p>
        <EventPhotosPanel
          eventId={event.id}
          photos={event.photos.map((photo) => ({
            id: photo.id,
            url: photo.url,
            caption: photo.caption,
            canDelete: canManageCircle(membership.role) || photo.uploadedBy === session.user.id,
          }))}
        />
      </Card>
    </AppShell>
  );
}
