import Link from "next/link";
import { redirect } from "next/navigation";
import { addMonths, format, isSameMonth, isToday, parseISO, startOfMonth } from "date-fns";
import { frCA } from "date-fns/locale";

import { BirthdayList } from "@/components/dashboard/birthday-list";
import { DashboardSection } from "@/components/dashboard/dashboard-section";
import { EventCard } from "@/components/events/event-card";
import { AppShell } from "@/components/layout/app-shell";
import { CircleSwitcher } from "@/components/layout/circle-switcher";
import { Badge } from "@/components/ui/badge";
import { auth } from "@/lib/auth";
import { getHolidayEntriesForMonth, getMonthGridDates } from "@/lib/calendar";
import { SHARED_TASK_PRIORITY_LABELS, SHARED_TASK_STATUS_LABELS } from "@/lib/constants";
import { formatEventDateTime, formatEventTime, getUtcRangeForEventMonth, toEventDateKey } from "@/lib/event-datetime";
import { prisma } from "@/lib/prisma";
import { getEffectiveTimeZone } from "@/lib/timezone";

type HomeCalendarItem = {
  id: string;
  label: string;
  kind: "event" | "birthday" | "holiday";
  timeLabel?: string;
};

export default async function TableauDeBordPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; circleId?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/connexion");
  }

  const { month, circleId: selectedCircleId } = await searchParams;

  const [memberships, user] = await Promise.all([
    prisma.circleMembership.findMany({
      where: { userId: session.user.id },
      include: { circle: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { timezone: true },
    }),
  ]);

  const effectiveTimeZone = getEffectiveTimeZone(user?.timezone);

  if (memberships.length === 0) {
    return (
      <AppShell title="Tableau de bord">
        <DashboardSection title="Bienvenue" description="Commencez par creer ou rejoindre un cercle familial.">
          <Link href="/cercles" className="inline-flex rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500">
            Aller a Mes cercles
          </Link>
        </DashboardSection>
      </AppShell>
    );
  }

  const activeMembership = memberships.find((membership) => membership.circleId === selectedCircleId) ?? memberships[0];
  const activeCircle = activeMembership.circle;
  const circleIds = [activeCircle.id];

  const parsedMonth = month ? parseISO(`${month}-01`) : new Date();
  const currentMonth = Number.isNaN(parsedMonth.getTime()) ? new Date() : parsedMonth;
  const monthStart = startOfMonth(currentMonth);
  const monthLabel = format(monthStart, "MMMM yyyy", { locale: frCA });
  const prevMonth = format(addMonths(monthStart, -1), "yyyy-MM");
  const nextMonth = format(addMonths(monthStart, 1), "yyyy-MM");
  const monthKey = format(monthStart, "yyyy-MM");
  const monthUtcRange = getUtcRangeForEventMonth(monthKey, effectiveTimeZone);
  const monthGridDates = getMonthGridDates(monthStart);
  const holidays = getHolidayEntriesForMonth(monthStart.getFullYear(), monthStart.getMonth());

  const [upcomingEvents, monthEvents, birthdays, managedBirthdays, messages, urgentItems, myTasks, urgentSharedTasks, recentLists] = await Promise.all([
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
    prisma.event.findMany({
      where: {
        circleId: { in: circleIds },
        startsAt: { gte: monthUtcRange.start, lte: monthUtcRange.end },
      },
      orderBy: { startsAt: "asc" },
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
      take: 40,
    }),
    prisma.managedFamilyMember.findMany({
      where: {
        owner: {
          circleMemberships: {
            some: { circleId: { in: circleIds } },
          },
        },
        birthDate: { not: null },
      },
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
      take: 40,
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
      include: {
        event: {
          select: {
            circleId: true,
            title: true,
          },
        },
      },
      orderBy: { updatedAt: "desc" },
      take: 6,
    }),
    prisma.sharedTask.findMany({
      where: {
        circleId: { in: circleIds },
        status: { not: "TERMINE" },
        OR: [{ assigneeUserId: session.user.id }, { createdById: session.user.id }],
      },
      orderBy: [{ priority: "desc" }, { dueAt: "asc" }, { createdAt: "desc" }],
      take: 5,
    }),
    prisma.sharedTask.findMany({
      where: {
        circleId: { in: circleIds },
        status: { not: "TERMINE" },
        priority: "URGENTE",
      },
      orderBy: [{ dueAt: "asc" }, { updatedAt: "desc" }],
      take: 5,
    }),
    prisma.sharedList.findMany({
      where: {
        circleId: { in: circleIds },
        isArchived: false,
      },
      include: {
        _count: {
          select: { items: true },
        },
      },
      orderBy: { updatedAt: "desc" },
      take: 4,
    }),
  ]);

  const itemsByDay = new Map<string, HomeCalendarItem[]>();
  const pushDayItem = (dateKey: string, item: HomeCalendarItem) => {
    const list = itemsByDay.get(dateKey) ?? [];
    list.push(item);
    itemsByDay.set(dateKey, list);
  };

  const allBirthdays = [
    ...birthdays.map((profile) => ({
      id: profile.id,
      firstName: profile.firstName,
      lastName: profile.lastName,
      birthDate: profile.birthDate,
    })),
    ...managedBirthdays.map((member) => ({
      id: member.id,
      firstName: member.firstName,
      lastName: member.lastName ?? "",
      birthDate: member.birthDate,
    })),
  ];

  for (const event of monthEvents) {
    const eventDate = new Date(event.startsAt);
    const dateKey = toEventDateKey(eventDate, effectiveTimeZone);
    pushDayItem(dateKey, {
      id: `event-${event.id}`,
      label: event.title,
      kind: "event",
      timeLabel: formatEventTime(eventDate, effectiveTimeZone),
    });
  }

  for (const profile of allBirthdays) {
    if (!profile.birthDate) continue;
    const birthDate = new Date(profile.birthDate);
    if (birthDate.getMonth() !== monthStart.getMonth()) continue;

    const dateKey = format(new Date(monthStart.getFullYear(), monthStart.getMonth(), birthDate.getDate()), "yyyy-MM-dd");
    pushDayItem(dateKey, {
      id: `birthday-${profile.id}`,
      label: `Anniversaire: ${profile.firstName}`,
      kind: "birthday",
    });
  }

  for (const holiday of holidays) {
    const dateKey = format(holiday.date, "yyyy-MM-dd");
    pushDayItem(dateKey, {
      id: `holiday-${holiday.label}`,
      label: holiday.label,
      kind: "holiday",
    });
  }

  const now = new Date();

  const todaysEvents = upcomingEvents.filter((event) => isToday(new Date(event.startsAt)));

  const todaysBirthdays = allBirthdays.filter((profile) => {
    if (!profile.birthDate) return false;
    const bd = new Date(profile.birthDate);
    return bd.getMonth() === now.getMonth() && bd.getDate() === now.getDate();
  });

  const upcomingBirthdays = allBirthdays
    .map((profile) => {
      if (!profile.birthDate) return null;
      const birthDate = new Date(profile.birthDate);
      const nextBirthday = new Date(now.getFullYear(), birthDate.getMonth(), birthDate.getDate());
      if (nextBirthday < now) {
        nextBirthday.setFullYear(nextBirthday.getFullYear() + 1);
      }

      const diffDays = Math.ceil((nextBirthday.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return {
        id: profile.id,
        firstName: profile.firstName,
        lastName: profile.lastName,
        birthDate: profile.birthDate,
        diffDays,
      };
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item))
    .sort((a, b) => a.diffDays - b.diffDays)
    .slice(0, 8);

  const rsvpMissingTasks = upcomingEvents
    .filter((event) => event.invites.length > event.attendances.length)
    .map((event) => ({
      id: event.id,
      title: event.title,
      circleId: event.circleId,
      missing: event.invites.length - event.attendances.length,
    }));

  const myPendingRsvpTasks = upcomingEvents
    .filter(
      (event) =>
        event.invites.some((invite) => invite.userId === session.user.id) &&
        !event.attendances.some((attendance) => attendance.userId === session.user.id),
    )
    .slice(0, 3)
    .map((event) => ({
      id: event.id,
      title: event.title,
      href: `/cercles/${event.circleId}/evenements/${event.id}`,
      dateLabel: formatEventDateTime(event.startsAt, effectiveTimeZone),
    }));

  const birthdaysSoon = upcomingBirthdays
    .filter((item) => item.diffDays <= 7)
    .slice(0, 3)
    .map((item) => ({
      id: item.id,
      name: `${item.firstName} ${item.lastName}`.trim(),
      diffDays: item.diffDays,
    }));

  const urgentItemsToReview = urgentItems.slice(0, 3).map((item) => ({
    id: item.id,
    name: item.name,
    status: item.status,
    href: `/cercles/${item.event.circleId}/evenements/${item.eventId}`,
    eventTitle: item.event.title,
  }));

  const urgentTaskCount = urgentItems.filter((item) => item.status === "URGENT").length;
  const missingItemCount = urgentItems.filter((item) => item.status === "MANQUANT").length;
  const birthdaysSoonCount = upcomingBirthdays.filter((item) => item.diffDays <= 7).length;

  return (
    <AppShell title="Tableau de bord">
      {(todaysEvents.length > 0 || todaysBirthdays.length > 0) ? (
        <DashboardSection title="Aujourd\u2019hui">
          {todaysEvents.map((event) => (
            <Link
              key={event.id}
              href={`/cercles/${event.circleId}/evenements/${event.id}`}
              className="block rounded-2xl border border-indigo-200 bg-indigo-50/60 px-3 py-3 transition-colors hover:bg-indigo-100/70"
            >
              <p className="text-sm font-bold text-indigo-900">{event.title}</p>
              <p className="mt-0.5 text-xs text-indigo-700">{formatEventDateTime(event.startsAt, effectiveTimeZone)} \u00b7 {event.locationName}</p>
            </Link>
          ))}
          {todaysBirthdays.map((birthday) => (
            <div key={birthday.id} className="rounded-2xl border border-pink-200 bg-pink-50/60 px-3 py-3">
              <p className="text-sm font-bold text-pink-900">
                \uD83C\uDF82 Anniversaire de {birthday.firstName} {birthday.lastName}
              </p>
              {birthday.birthDate ? (
                <p className="mt-0.5 text-xs text-pink-700">
                  {new Date().getFullYear() - new Date(birthday.birthDate).getFullYear()} ans
                </p>
              ) : null}
            </div>
          ))}
        </DashboardSection>
      ) : null}
      <DashboardSection title="Mes taches et listes" description="Ce que tu peux regler rapidement aujourd'hui.">
        <div className="space-y-3">
          <div className="rounded-2xl border border-amber-100 bg-amber-50/70 p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-bold text-zinc-900">Mes taches</p>
              <Link href={`/cercles/${activeCircle.id}/taches`} className="text-xs font-semibold text-amber-800 hover:underline">
                Ouvrir →
              </Link>
            </div>
            <div className="mt-2 space-y-2">
              {myTasks.length === 0 ? <p className="text-sm text-zinc-600">Aucune tache en attente.</p> : null}
              {myTasks.map((task) => (
                <Link key={task.id} href={`/cercles/${task.circleId}/taches`} className="block rounded-xl bg-white px-3 py-2 transition-colors hover:bg-amber-100/70">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-zinc-900">{task.title}</span>
                    <Badge variant={task.priority === "URGENTE" ? "danger" : task.priority === "IMPORTANTE" ? "warning" : "secondary"}>
                      {SHARED_TASK_PRIORITY_LABELS[task.priority]}
                    </Badge>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-2 text-xs text-zinc-600">
                    <span>{SHARED_TASK_STATUS_LABELS[task.status]}</span>
                    {task.dueAt ? <span>Avant le {new Date(task.dueAt).toLocaleDateString("fr-CA", { month: "short", day: "numeric" })}</span> : null}
                  </div>
                </Link>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-rose-100 bg-rose-50/70 p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-bold text-zinc-900">Taches urgentes</p>
              <Badge variant="danger">{urgentSharedTasks.length}</Badge>
            </div>
            <div className="mt-2 space-y-2">
              {urgentSharedTasks.length === 0 ? <p className="text-sm text-zinc-600">Aucune urgence cote taches.</p> : null}
              {urgentSharedTasks.map((task) => (
                <Link key={task.id} href={`/cercles/${task.circleId}/taches`} className="block rounded-xl bg-white px-3 py-2 transition-colors hover:bg-rose-100/70">
                  <span className="block text-sm font-semibold text-zinc-900">{task.title}</span>
                  <span className="text-xs text-zinc-600">{task.dueAt ? `Avant le ${new Date(task.dueAt).toLocaleDateString("fr-CA", { month: "short", day: "numeric" })}` : "Sans echeance"}</span>
                </Link>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-indigo-100 bg-indigo-50/70 p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-bold text-zinc-900">Listes recentes</p>
              <Link href={`/cercles/${activeCircle.id}/listes`} className="text-xs font-semibold text-indigo-700 hover:underline">
                Ouvrir →
              </Link>
            </div>
            <div className="mt-2 space-y-2">
              {recentLists.length === 0 ? <p className="text-sm text-zinc-600">Aucune liste recente.</p> : null}
              {recentLists.map((list) => (
                <Link key={list.id} href={`/cercles/${list.circleId}/listes`} className="block rounded-xl bg-white px-3 py-2 transition-colors hover:bg-indigo-100/70">
                  <span className="block text-sm font-semibold text-zinc-900">{list.title}</span>
                  <span className="text-xs text-zinc-600">{list._count.items} item(s)</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </DashboardSection>
      <DashboardSection title={`Calendrier mensuel - ${monthLabel}`} description="Vue rapide des evenements et anniversaires de ce mois.">
        <div className="mb-3">
          <CircleSwitcher
            circles={memberships.map((membership) => ({
              id: membership.circle.id,
              name: membership.circle.name,
              photoUrl: membership.circle.photoUrl,
              description: membership.circle.description,
            }))}
            currentCircleId={activeCircle.id}
            navigateBasePath="/tableau-de-bord"
            queryParamName="circleId"
          />
        </div>
        <div className="mb-3 flex items-center justify-between gap-2">
          <Link
            href={`/tableau-de-bord?month=${prevMonth}&circleId=${activeCircle.id}`}
            className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-zinc-700 shadow-sm hover:bg-zinc-50"
          >
            Mois precedent
          </Link>
          <p className="text-sm font-semibold capitalize text-zinc-800">{monthLabel}</p>
          <Link
            href={`/tableau-de-bord?month=${nextMonth}&circleId=${activeCircle.id}`}
            className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-zinc-700 shadow-sm hover:bg-zinc-50"
          >
            Mois suivant
          </Link>
        </div>
        <div className="mb-1 grid grid-cols-7 gap-1 text-[11px] font-semibold text-zinc-500">
          {["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map((dayName) => (
            <div key={dayName} className="rounded-lg bg-zinc-50 px-1 py-1 text-center">
              {dayName}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1 text-xs">
          {monthGridDates.map((dayDate) => {
            const dateKey = format(dayDate, "yyyy-MM-dd");
            const dayItems = itemsByDay.get(dateKey) ?? [];
            const visibleItems = dayItems.slice(0, 2);
            const hiddenCount = Math.max(0, dayItems.length - visibleItems.length);
            const isCurrentMonth = isSameMonth(dayDate, monthStart);
            const dayLink = `/cercles/${activeCircle.id}/calendrier/jour/${dateKey}`;

            return (
              <Link
                key={dateKey}
                href={dayLink}
                className={`block min-h-20 rounded-xl border p-1.5 transition-colors hover:border-indigo-300 hover:bg-indigo-50/40 active:scale-[0.995] ${isCurrentMonth ? "border-indigo-100 bg-white" : "border-zinc-100 bg-zinc-50"}`}
              >
                <p className={`mb-0.5 text-[11px] font-semibold ${isToday(dayDate) ? "text-indigo-700" : isCurrentMonth ? "text-zinc-700" : "text-zinc-400"}`}>
                  <span className={`inline-flex h-6 min-w-6 items-center justify-center rounded-full px-1 ${isToday(dayDate) ? "bg-indigo-100" : ""}`}>{format(dayDate, "d")}</span>
                </p>
                {visibleItems.map((item) => (
                  <div
                    key={item.id}
                    className={`mt-0.5 truncate rounded-md px-1 py-0.5 text-[10px] font-medium ${
                      item.kind === "event"
                        ? "bg-indigo-100 text-indigo-800"
                        : item.kind === "birthday"
                          ? "bg-pink-100 text-pink-800"
                          : "bg-amber-100 text-amber-900"
                    }`}
                  >
                    {item.timeLabel ? `${item.timeLabel} ` : ""}
                    {item.label}
                  </div>
                ))}
                {hiddenCount > 0 ? <p className="mt-0.5 text-[10px] font-medium text-zinc-500">+ {hiddenCount} autres</p> : null}
              </Link>
            );
          })}
        </div>
      </DashboardSection>

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
              startsAt: formatEventDateTime(event.startsAt, effectiveTimeZone),
              endsAt: event.endsAt ? formatEventDateTime(event.endsAt, effectiveTimeZone) : undefined,
              locationName: event.locationName,
              missingResponses: Math.max(0, event.invites.length - event.attendances.length),
            }}
          />
        ))}
      </DashboardSection>

      <DashboardSection title="Anniversaires a venir">
        {upcomingBirthdays.length === 0 ? <p className="rounded-2xl border border-pink-100 bg-pink-50/60 px-3 py-3 text-sm text-zinc-600">Aucun anniversaire a venir ce mois-ci.</p> : null}
        <BirthdayList
          items={upcomingBirthdays.map((birthday) => ({
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
          {rsvpMissingTasks.length === 0 ? (
            <li className="rounded-2xl border border-emerald-100 bg-emerald-50/60 px-3 py-3 text-zinc-600">Toutes les reponses sont a jour.</li>
          ) : null}
          {rsvpMissingTasks.map((task) => (
              <li key={task.id} className="rounded-2xl border border-amber-100 bg-amber-50/70 px-3 py-3 font-medium text-amber-900">
                {task.title}: {task.missing} reponse(s) manquante(s)
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

      <DashboardSection title="Mes priorites" description="Les actions les plus utiles pour toi cette semaine.">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-amber-100 bg-amber-50/70 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">RSVP a faire</p>
            <p className="mt-1 text-2xl font-bold text-zinc-900">{myPendingRsvpTasks.length}</p>
            <div className="mt-2 space-y-2 text-sm">
              {myPendingRsvpTasks.length === 0 ? <p className="text-zinc-600">Tout est repondu.</p> : null}
              {myPendingRsvpTasks.map((task) => (
                <Link key={task.id} href={task.href} className="block rounded-xl bg-white px-3 py-2 text-zinc-700 transition-colors hover:bg-amber-100/70">
                  <span className="block font-semibold text-zinc-900">{task.title}</span>
                  <span className="text-xs text-zinc-600">{task.dateLabel}</span>
                </Link>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-pink-100 bg-pink-50/70 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-pink-700">Anniversaires proches</p>
            <p className="mt-1 text-2xl font-bold text-zinc-900">{birthdaysSoonCount}</p>
            <div className="mt-2 space-y-2 text-sm">
              {birthdaysSoon.length === 0 ? <p className="text-zinc-600">Rien dans les 7 prochains jours.</p> : null}
              {birthdaysSoon.map((item) => (
                <div key={item.id} className="rounded-xl bg-white px-3 py-2 text-zinc-700">
                  <span className="block font-semibold text-zinc-900">{item.name}</span>
                  <span className="text-xs text-zinc-600">{item.diffDays === 0 ? "Aujourd'hui" : `Dans ${item.diffDays} jour(s)`}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-rose-100 bg-rose-50/70 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-rose-700">Urgences du cercle</p>
            <p className="mt-1 text-2xl font-bold text-zinc-900">{urgentTaskCount + missingItemCount}</p>
            <div className="mt-2 space-y-2 text-sm">
              {urgentItemsToReview.length === 0 ? <p className="text-zinc-600">Aucun item a surveiller.</p> : null}
              {urgentItemsToReview.map((item) => (
                <Link key={item.id} href={item.href} className="block rounded-xl bg-white px-3 py-2 text-zinc-700 transition-colors hover:bg-rose-100/70">
                  <span className="block font-semibold text-zinc-900">{item.name}</span>
                  <span className="text-xs text-zinc-600">{item.eventTitle} · {item.status}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </DashboardSection>

    </AppShell>
  );
}
