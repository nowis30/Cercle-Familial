import Link from "next/link";
import { redirect } from "next/navigation";
import { addMonths, endOfMonth, format, isSameMonth, isToday, parseISO, startOfMonth } from "date-fns";
import { frCA } from "date-fns/locale";

import { BirthdayList } from "@/components/dashboard/birthday-list";
import { DashboardSection } from "@/components/dashboard/dashboard-section";
import { EventCard } from "@/components/events/event-card";
import { AppShell } from "@/components/layout/app-shell";
import { auth } from "@/lib/auth";
import { getHolidayEntriesForMonth, getMonthGridDates } from "@/lib/calendar";
import { prisma } from "@/lib/prisma";

type HomeCalendarItem = {
  id: string;
  label: string;
  kind: "event" | "birthday" | "holiday";
  href?: string;
  timeLabel?: string;
};

export default async function TableauDeBordPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/connexion");
  }

  const { month } = await searchParams;

  const memberships = await prisma.circleMembership.findMany({
    where: { userId: session.user.id },
    select: { circleId: true },
  });
  const circleIds = memberships.map((membership) => membership.circleId);

  const parsedMonth = month ? parseISO(`${month}-01`) : new Date();
  const currentMonth = Number.isNaN(parsedMonth.getTime()) ? new Date() : parsedMonth;
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const monthLabel = format(monthStart, "MMMM yyyy", { locale: frCA });
  const prevMonth = format(addMonths(monthStart, -1), "yyyy-MM");
  const nextMonth = format(addMonths(monthStart, 1), "yyyy-MM");
  const monthGridDates = getMonthGridDates(monthStart);
  const holidays = getHolidayEntriesForMonth(monthStart.getFullYear(), monthStart.getMonth());

  const monthEndInclusive = new Date(monthEnd.getFullYear(), monthEnd.getMonth(), monthEnd.getDate(), 23, 59, 59);

  const [upcomingEvents, monthEvents, birthdays, messages, urgentItems] = await Promise.all([
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
        startsAt: { gte: monthStart, lte: monthEndInclusive },
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

  const itemsByDay = new Map<string, HomeCalendarItem[]>();
  const pushDayItem = (dateKey: string, item: HomeCalendarItem) => {
    const list = itemsByDay.get(dateKey) ?? [];
    list.push(item);
    itemsByDay.set(dateKey, list);
  };

  for (const event of monthEvents) {
    const eventDate = new Date(event.startsAt);
    const dateKey = format(eventDate, "yyyy-MM-dd");
    pushDayItem(dateKey, {
      id: `event-${event.id}`,
      label: event.title,
      kind: "event",
      href: `/cercles/${event.circleId}/evenements/${event.id}`,
      timeLabel: format(eventDate, "HH:mm"),
    });
  }

  for (const profile of birthdays) {
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
  const upcomingBirthdays = birthdays
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

  const urgentTaskCount = urgentItems.filter((item) => item.status === "URGENT").length;
  const missingItemCount = urgentItems.filter((item) => item.status === "MANQUANT").length;
  const birthdaysSoonCount = upcomingBirthdays.filter((item) => item.diffDays <= 7).length;

  return (
    <AppShell title="Tableau de bord">
      <DashboardSection title={`Calendrier mensuel - ${monthLabel}`} description="Vue rapide des evenements et anniversaires de ce mois.">
        <div className="mb-3 flex items-center justify-between gap-2">
          <Link
            href={`/tableau-de-bord?month=${prevMonth}`}
            className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-zinc-700 shadow-sm hover:bg-zinc-50"
          >
            Mois precedent
          </Link>
          <p className="text-sm font-semibold capitalize text-zinc-800">{monthLabel}</p>
          <Link
            href={`/tableau-de-bord?month=${nextMonth}`}
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

            return (
              <div key={dateKey} className={`min-h-20 rounded-xl border p-1.5 ${isCurrentMonth ? "border-indigo-100 bg-white" : "border-zinc-100 bg-zinc-50"}`}>
                <p className={`mb-0.5 text-[11px] font-semibold ${isToday(dayDate) ? "text-indigo-700" : isCurrentMonth ? "text-zinc-700" : "text-zinc-400"}`}>
                  <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full ${isToday(dayDate) ? "bg-indigo-100" : ""}`}>{format(dayDate, "d")}</span>
                </p>
                {visibleItems.map((item) => (
                  item.href ? (
                    <Link
                      key={item.id}
                      href={item.href}
                      className={`mt-0.5 block truncate rounded-md px-1 py-0.5 text-[10px] font-medium ${
                        item.kind === "event"
                          ? "bg-indigo-100 text-indigo-800"
                          : item.kind === "birthday"
                            ? "bg-pink-100 text-pink-800"
                            : "bg-amber-100 text-amber-900"
                      }`}
                    >
                      {item.timeLabel ? `${item.timeLabel} ` : ""}
                      {item.label}
                    </Link>
                  ) : (
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
                      {item.label}
                    </div>
                  )
                ))}
                {hiddenCount > 0 ? <p className="mt-0.5 text-[10px] font-medium text-zinc-500">+ {hiddenCount} autres</p> : null}
              </div>
            );
          })}
        </div>
      </DashboardSection>

      <DashboardSection title="Choses a faire" description="Priorites rapides pour garder le cercle a jour.">
        <ul className="space-y-2 text-sm">
          <li className="rounded-2xl border border-amber-100 bg-amber-50/70 px-3 py-3">
            <span className="font-semibold text-zinc-900">RSVP manquants:</span> {rsvpMissingTasks.length} evenement(s) a relancer
          </li>
          <li className="rounded-2xl border border-rose-100 bg-rose-50/70 px-3 py-3">
            <span className="font-semibold text-zinc-900">Items urgents:</span> {urgentTaskCount}
          </li>
          <li className="rounded-2xl border border-rose-100 bg-rose-50/40 px-3 py-3">
            <span className="font-semibold text-zinc-900">Items manquants:</span> {missingItemCount}
          </li>
          <li className="rounded-2xl border border-pink-100 bg-pink-50/70 px-3 py-3">
            <span className="font-semibold text-zinc-900">Anniversaires a souhaiter (7 jours):</span> {birthdaysSoonCount}
          </li>
        </ul>
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
              startsAt: new Date(event.startsAt).toLocaleString("fr-CA"),
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

    </AppShell>
  );
}
