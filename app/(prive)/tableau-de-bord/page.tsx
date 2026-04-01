import Link from "next/link";
import { redirect } from "next/navigation";

import { BirthdayList } from "@/components/dashboard/birthday-list";
import { DashboardSection } from "@/components/dashboard/dashboard-section";
import { EventCard } from "@/components/events/event-card";
import { AppShell } from "@/components/layout/app-shell";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function TableauDeBordPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/connexion");
  }

  const memberships = await prisma.circleMembership.findMany({
    where: { userId: session.user.id },
    select: { circleId: true },
  });
  const circleIds = memberships.map((membership) => membership.circleId);

  const [upcomingEvents, birthdays, messages, urgentItems] = await Promise.all([
    prisma.event.findMany({
      where: {
        circleId: { in: circleIds },
        startsAt: { gte: new Date() },
      },
      orderBy: { startsAt: "asc" },
      take: 6,
      include: {
        attendances: true,
        invites: true,
      },
    }),
    prisma.personProfile.findMany({
      where: {
        user: {
          circleMemberships: {
            some: { circleId: { in: circleIds } },
          },
        },
        birthDate: { not: null },
      },
      include: { user: true },
      take: 8,
    }),
    prisma.circleMessage.findMany({
      where: { circleId: { in: circleIds } },
      include: { author: true },
      orderBy: { createdAt: "desc" },
      take: 6,
    }),
    prisma.eventContributionItem.findMany({
      where: {
        event: {
          circleId: { in: circleIds },
        },
        status: { in: ["URGENT", "MANQUANT"] },
      },
      orderBy: { updatedAt: "desc" },
      take: 6,
    }),
  ]);

  return (
    <AppShell title="Tableau de bord">
      <DashboardSection title="Prochains evenements" description="Ce qui s'en vient dans vos cercles.">
        {upcomingEvents.map((event) => (
          <EventCard
            key={event.id}
            circleId={event.circleId}
            event={{
              id: event.id,
              title: event.title,
              type: event.type,
              startsAt: new Date(event.startsAt).toLocaleString("fr-CA"),
              locationName: event.locationName,
              missingResponses: Math.max(0, event.invites.length - event.attendances.length),
            }}
          />
        ))}
      </DashboardSection>

      <DashboardSection title="Anniversaires a venir">
        <BirthdayList
          items={birthdays.map((birthday) => ({
            id: birthday.id,
            name: `${birthday.firstName} ${birthday.lastName}`,
            date: birthday.birthDate ? new Date(birthday.birthDate).toLocaleDateString("fr-CA", { month: "long", day: "numeric" }) : "-",
          }))}
        />
      </DashboardSection>

      <DashboardSection title="Messages recents">
        <ul className="space-y-2">
          {messages.map((message) => (
            <li key={message.id} className="rounded-xl bg-zinc-50 px-3 py-2 text-sm">
              <span className="font-medium">{message.author.name}: </span>
              {message.content}
            </li>
          ))}
        </ul>
      </DashboardSection>

      <DashboardSection title="Reponses manquantes">
        <ul className="space-y-2 text-sm">
          {upcomingEvents
            .filter((event) => event.invites.length > event.attendances.length)
            .map((event) => (
              <li key={event.id} className="rounded-xl bg-zinc-50 px-3 py-2">
                {event.title}: {event.invites.length - event.attendances.length} reponse(s) manquante(s)
              </li>
            ))}
        </ul>
      </DashboardSection>

      <DashboardSection title="Items urgents ou manquants">
        <ul className="space-y-2 text-sm">
          {urgentItems.map((item) => (
            <li key={item.id} className="rounded-xl bg-zinc-50 px-3 py-2">
              {item.name} x{item.quantity} - {item.status}
            </li>
          ))}
        </ul>
      </DashboardSection>

      <DashboardSection title="Acces rapides">
        <div className="grid grid-cols-2 gap-2 text-sm">
          <Link href="/cercles" className="rounded-xl border border-zinc-200 bg-white px-3 py-2">
            Mes cercles
          </Link>
          <Link href="/cercles" className="rounded-xl border border-zinc-200 bg-white px-3 py-2">
            Calendrier
          </Link>
        </div>
      </DashboardSection>
    </AppShell>
  );
}
