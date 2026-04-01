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
        {upcomingEvents.length === 0 ? <p className="rounded-2xl border border-indigo-100 bg-indigo-50/60 px-3 py-3 text-sm text-zinc-600">Aucun evenement planifie pour le moment.</p> : null}
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
        {birthdays.length === 0 ? <p className="rounded-2xl border border-pink-100 bg-pink-50/60 px-3 py-3 text-sm text-zinc-600">Aucun anniversaire a venir ce mois-ci.</p> : null}
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
          {messages.length === 0 ? <li className="rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-3 text-sm text-zinc-600">Pas encore de message recent.</li> : null}
          {messages.map((message) => (
            <li key={message.id} className="rounded-2xl border border-zinc-200/80 bg-zinc-50/70 px-3 py-3 text-sm">
              <span className="font-semibold text-zinc-900">{message.author.name}: </span>
              <span className="text-zinc-700">{message.content}</span>
            </li>
          ))}
        </ul>
      </DashboardSection>

      <DashboardSection title="Reponses manquantes">
        <ul className="space-y-2 text-sm">
          {upcomingEvents.filter((event) => event.invites.length > event.attendances.length).length === 0 ? (
            <li className="rounded-2xl border border-emerald-100 bg-emerald-50/60 px-3 py-3 text-zinc-600">Toutes les reponses sont a jour.</li>
          ) : null}
          {upcomingEvents
            .filter((event) => event.invites.length > event.attendances.length)
            .map((event) => (
              <li key={event.id} className="rounded-2xl border border-amber-100 bg-amber-50/70 px-3 py-3 font-medium text-amber-900">
                {event.title}: {event.invites.length - event.attendances.length} reponse(s) manquante(s)
              </li>
            ))}
        </ul>
      </DashboardSection>

      <DashboardSection title="Items urgents ou manquants">
        <ul className="space-y-2 text-sm">
          {urgentItems.length === 0 ? <li className="rounded-2xl border border-emerald-100 bg-emerald-50/60 px-3 py-3 text-zinc-600">Aucun item urgent ou manquant.</li> : null}
          {urgentItems.map((item) => (
            <li key={item.id} className="rounded-2xl border border-rose-100 bg-rose-50/70 px-3 py-3">
              <span className="font-semibold text-zinc-900">{item.name}</span> x{item.quantity}
              <span className="ml-2 rounded-full bg-white px-2 py-1 text-xs font-semibold text-rose-700">{item.status}</span>
            </li>
          ))}
        </ul>
      </DashboardSection>

      <DashboardSection title="Acces rapides">
        <div className="grid grid-cols-2 gap-2 text-sm">
          <Link href="/cercles" className="rounded-2xl border border-indigo-100 bg-indigo-50/70 px-3 py-3 font-semibold text-indigo-800 transition-colors hover:bg-indigo-100">
            Mes cercles
          </Link>
          <Link href="/cercles" className="rounded-2xl border border-zinc-200 bg-white px-3 py-3 font-semibold text-zinc-700 transition-colors hover:bg-zinc-50">
            Calendrier
          </Link>
        </div>
      </DashboardSection>
    </AppShell>
  );
}
