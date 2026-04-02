import Link from "next/link";
import { redirect } from "next/navigation";

import { EventCommentsPanel } from "@/components/events/event-comments-panel";
import { EventContributionsPanel } from "@/components/events/event-contributions-panel";
import { EventManagementActions } from "@/components/events/event-management-actions";
import { EventMealsPanel } from "@/components/events/event-meals-panel";
import { EventParticipantsPanel } from "@/components/events/event-participants-panel";
import { EventPhotosPanel } from "@/components/events/event-photos-panel";
import { AppShell } from "@/components/layout/app-shell";
import { SharedNotesBoard } from "@/components/notes/shared-notes-board";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { auth } from "@/lib/auth";
import { RSVP_LABELS } from "@/lib/constants";
import { formatEventDateTime } from "@/lib/event-datetime";
import { buildGoogleCalendarUrl } from "@/lib/event-calendar";
import { canCreateEvent, canManageCircle } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { getEffectiveTimeZone } from "@/lib/timezone";

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
      attendances: {
        include: {
          user: true,
          linkedMembers: {
            include: {
              managedMember: true,
            },
          },
        },
      },
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
      meals: {
        include: {
          linkedList: {
            select: {
              id: true,
              title: true,
              circleId: true,
            },
          },
          createdBy: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: [{ isPinned: "desc" }, { createdAt: "asc" }],
      },
    },
  });

  if (!event) {
    redirect(`/cercles/${circleId}`);
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { timezone: true },
  });
  const effectiveTimeZone = getEffectiveTimeZone(user?.timezone);

  const myRsvp = event.attendances.find((attendance) => attendance.userId === session.user.id);
  const [managedFamilyMembers, eventNotes, listOptions] = await Promise.all([
    prisma.managedFamilyMember.findMany({
      where: { ownerUserId: session.user.id },
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
    }),
    prisma.sharedNote.findMany({
      where: {
        circleId,
        eventId,
      },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: [{ isPinned: "desc" }, { updatedAt: "desc" }],
      take: 100,
    }),
    prisma.sharedList.findMany({
      where: {
        circleId,
        isArchived: false,
      },
      select: {
        id: true,
        title: true,
      },
      orderBy: { updatedAt: "desc" },
      take: 20,
    }),
  ]);
  const totalResponses = event.attendances.length;
  const totalPeople = event.attendances.reduce((sum, attendance) => sum + attendance.totalCount, 0);
  const totalAdults = event.attendances.reduce((sum, attendance) => sum + attendance.adultsCount, 0);
  const totalChildren = event.attendances.reduce((sum, attendance) => sum + attendance.childrenCount, 0);
  const missingResponses = Math.max(0, event.invites.length - totalResponses);
  const isInvited = event.invites.some((invite) => invite.userId === session.user.id);
  const myRsvpVariant = myRsvp?.response === "JE_VIENS" ? "default" : myRsvp?.response === "PEUT_ETRE" ? "warning" : "danger";
  const startsAtLabel = formatEventDateTime(event.startsAt, effectiveTimeZone);
  const endsAtLabel = event.endsAt ? formatEventDateTime(event.endsAt, effectiveTimeZone) : null;
  const canManageEvent = canManageCircle(membership.role) || event.hostId === session.user.id;
  const canManageContributionItems = canCreateEvent(membership.role);
  const addToGoogleCalendarUrl = buildGoogleCalendarUrl({
    id: event.id,
    title: event.title,
    description: event.description,
    locationName: event.locationName,
    address: event.address,
    startsAt: new Date(event.startsAt),
    endsAt: event.endsAt ? new Date(event.endsAt) : null,
    timeZone: effectiveTimeZone,
  });
  const addToIcsUrl = `/api/calendar/events/${event.id}/ics`;

  return (
    <AppShell title={event.title}>
      {isInvited && !myRsvp ? (
        <a
          href="#participants"
          className="block rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900 transition-colors hover:bg-amber-100"
        >
          ⚠\uFE0F Tu n&apos;as pas encore repondu a cette invitation.{" "}
          <span className="underline">Repondre maintenant \u2193</span>
        </a>
      ) : null}
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
          <a
            href="#participants"
            className="rounded-xl border border-indigo-200 bg-white px-3 py-2 text-xs font-semibold text-indigo-700 hover:bg-indigo-50"
          >
            Participants
          </a>
        </div>
        <div className="mt-2">
          <EventManagementActions circleId={circleId} eventId={event.id} eventTitle={event.title} canManage={canManageEvent} />
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
      <EventParticipantsPanel
        eventId={event.id}
        myInitial={
          myRsvp
            ? {
                response: myRsvp.response,
                includeSelf: myRsvp.adultsCount > 0,
                linkedMemberIds: myRsvp.linkedMembers.map((link) => link.managedMemberId),
                note: myRsvp.note ?? "",
              }
            : undefined
        }
        familyMembers={managedFamilyMembers.map((member) => ({
          id: member.id,
          label: `${member.firstName}${member.lastName ? ` ${member.lastName}` : ""}`.trim(),
          relationLabel: member.relationLabel,
        }))}
        groups={event.attendances.map((attendance) => ({
          responderName: attendance.user.name,
          response: attendance.response,
          includeSelf: attendance.adultsCount > 0,
          linkedMembers: attendance.linkedMembers.map((link) => ({
            id: link.managedMember.id,
            label: `${link.managedMember.firstName}${link.managedMember.lastName ? ` ${link.managedMember.lastName}` : ""}`.trim(),
          })),
        }))}
      />
      <Card>
        <p className="mb-2 font-serif text-lg font-bold text-zinc-900">Menus et repas</p>
        <EventMealsPanel
          circleId={circleId}
          eventId={event.id}
          canManage={canManageContributionItems}
          meals={event.meals.map((meal) => ({
            id: meal.id,
            title: meal.title,
            description: meal.description,
            recipe: meal.recipe,
            servedAtLabel: meal.servedAtLabel,
            isPinned: meal.isPinned,
            linkedListId: meal.linkedListId,
            linkedListTitle: meal.linkedList?.title ?? null,
            createdByName: meal.createdBy.name,
          }))}
          listOptions={listOptions}
        />
      </Card>
      <Card>
        <p className="mb-2 font-serif text-lg font-bold text-zinc-900">Qui apporte quoi</p>
        <EventContributionsPanel
          eventId={event.id}
          canManageItems={canManageContributionItems}
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
      <SharedNotesBoard
        circleId={circleId}
        eventId={eventId}
        canCreateNotes={canCreateEvent(membership.role)}
        notes={eventNotes.map((note) => ({
          id: note.id,
          title: note.title,
          content: note.content,
          isPinned: note.isPinned,
          createdByName: note.createdBy.name,
          createdAtLabel: new Intl.DateTimeFormat("fr-CA", {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          }).format(note.createdAt),
          canManage: canManageCircle(membership.role) || note.createdById === session.user.id,
        }))}
        contextLabel={`l'evenement ${event.title}`}
      />
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
