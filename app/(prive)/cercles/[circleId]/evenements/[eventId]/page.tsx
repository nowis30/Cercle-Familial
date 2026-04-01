import Link from "next/link";
import { redirect } from "next/navigation";

import { EventCommentsPanel } from "@/components/events/event-comments-panel";
import { EventContributionsPanel } from "@/components/events/event-contributions-panel";
import { EventManagementActions } from "@/components/events/event-management-actions";
import { EventPhotosPanel } from "@/components/events/event-photos-panel";
import { RSVPForm } from "@/components/events/rsvp-form";
import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { auth } from "@/lib/auth";
import { RSVP_LABELS } from "@/lib/constants";
import { buildGoogleCalendarUrl } from "@/lib/event-calendar";
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

  const event = await prisma.event.findFirst({
    where: {
      id: eventId,
      circleId,
    },
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

  if (!event) {
    redirect(`/cercles/${circleId}`);
  }

  const myRsvp = event.attendances.find((attendance) => attendance.userId === session.user.id);
  const totalResponses = event.attendances.length;
  const totalPeople = event.attendances.reduce((sum, attendance) => sum + attendance.totalCount, 0);
  const totalAdults = event.attendances.reduce((sum, attendance) => sum + attendance.adultsCount, 0);
  const totalChildren = event.attendances.reduce((sum, attendance) => sum + attendance.childrenCount, 0);
  const missingResponses = Math.max(0, event.invites.length - totalResponses);
  const myRsvpVariant = myRsvp?.response === "JE_VIENS" ? "default" : myRsvp?.response === "PEUT_ETRE" ? "warning" : "danger";
  const startsAtLabel = new Date(event.startsAt).toLocaleString("fr-CA");
  const endsAtLabel = event.endsAt ? new Date(event.endsAt).toLocaleString("fr-CA") : null;
  const canManageEvent = canManageCircle(membership.role) || event.hostId === session.user.id;
  const addToGoogleCalendarUrl = buildGoogleCalendarUrl({
    id: event.id,
    title: event.title,
    description: event.description,
    locationName: event.locationName,
    address: event.address,
    startsAt: new Date(event.startsAt),
    endsAt: event.endsAt ? new Date(event.endsAt) : null,
  });
  const addToIcsUrl = `/api/calendar/events/${event.id}/ics`;

  return (
    <AppShell title={event.title}>
      <Card className="bg-gradient-to-br from-white to-indigo-50/50">
        <p className="text-sm font-semibold text-indigo-700">Debut: {startsAtLabel}</p>
        <p className="mt-1 text-sm text-indigo-700">Fin: {endsAtLabel ?? "Non definie"}</p>
        <p className="mt-1 text-sm text-zinc-700">Lieu: {event.locationName}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link
            href={addToGoogleCalendarUrl}
            target="_blank"
            rel="noreferrer"
            className="rounded-xl border border-indigo-200 bg-white px-3 py-2 text-xs font-semibold text-indigo-700 hover:bg-indigo-50"
          >
            Ajouter au calendrier (Google)
          </Link>
          <Link
            href={addToIcsUrl}
            className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
          >
            Ajouter au calendrier (.ics)
          </Link>
        </div>
        <div className="mt-2">
          <EventManagementActions circleId={circleId} eventId={event.id} canManage={canManageEvent} />
        </div>
        <div className="mt-2">
          {myRsvp ? <Badge variant={myRsvpVariant}>Mon RSVP: {RSVP_LABELS[myRsvp.response] ?? myRsvp.response}</Badge> : <Badge variant="secondary">Mon RSVP: Non repondu</Badge>}
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
          <p className="rounded-xl bg-white px-2 py-1 text-zinc-700">Reponses: {totalResponses}</p>
          <p className="rounded-xl bg-white px-2 py-1 text-zinc-700">Personnes: {totalPeople}</p>
          <p className="rounded-xl bg-white px-2 py-1 text-zinc-700">Adultes: {totalAdults}</p>
          <p className="rounded-xl bg-white px-2 py-1 text-zinc-700">Enfants: {totalChildren}</p>
          <p className="rounded-xl bg-amber-50 px-2 py-1 font-semibold text-amber-800">Manquantes: {missingResponses}</p>
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
        <p className="mb-2 font-serif text-lg font-bold text-zinc-900">Qui apporte quoi</p>
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
        <p className="mb-2 font-serif text-lg font-bold text-zinc-900">Commentaires</p>
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
        <p className="mb-2 font-serif text-lg font-bold text-zinc-900">Photos souvenirs</p>
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
