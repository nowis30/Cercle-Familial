import Link from "next/link";
import { redirect } from "next/navigation";
import {
  addMonths,
  format,
  isSameMonth,
  isToday,
  parseISO,
  startOfMonth,
} from "date-fns";
import { frCA } from "date-fns/locale";

import { AppShell } from "@/components/layout/app-shell";
import { Card } from "@/components/ui/card";
import { auth } from "@/lib/auth";
import { getHolidayEntriesForMonth, getMonthGridDates } from "@/lib/calendar";
import { formatEventTime, getUtcRangeForEventMonth, toEventDateKey } from "@/lib/event-datetime";
import { prisma } from "@/lib/prisma";
import { getEffectiveTimeZone } from "@/lib/timezone";

type DayItem = {
  id: string;
  kind: "event" | "birthday" | "important" | "holiday";
  label: string;
  href?: string;
  timeLabel?: string;
  timeRangeLabel?: string;
};

export default async function CalendrierPage({
  params,
  searchParams,
}: {
  params: Promise<{ circleId: string }>;
  searchParams: Promise<{ month?: string; type?: string; day?: string }>;
}) {
  const { circleId } = await params;
  const { month, type, day } = await searchParams;
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

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { timezone: true },
  });
  const effectiveTimeZone = getEffectiveTimeZone(user?.timezone);

  const now = month ? parseISO(`${month}-01`) : new Date();
  const currentMonth = Number.isNaN(now.getTime()) ? new Date() : now;
  const monthStart = startOfMonth(currentMonth);
  const monthLabel = format(monthStart, "MMMM yyyy", { locale: frCA });

  const selectedType = type ?? "ALL";
  const eventWhereType = selectedType === "ALL" ? undefined : selectedType;
  const monthKey = format(monthStart, "yyyy-MM");
  const monthUtcRange = getUtcRangeForEventMonth(monthKey, effectiveTimeZone);

  const [events, birthdays, importantDates] = await Promise.all([
    prisma.event.findMany({
      where: {
        circleId,
        startsAt: { gte: monthUtcRange.start, lte: monthUtcRange.end },
        ...(eventWhereType ? { type: eventWhereType as never } : {}),
      },
      orderBy: { startsAt: "asc" },
    }),
    prisma.personProfile.findMany({
      where: {
        user: {
          circleMemberships: {
            some: { circleId },
          },
        },
        birthDate: { not: null },
      },
      include: { user: true },
    }),
    prisma.personProfile.findMany({
      where: {
        user: {
          circleMemberships: {
            some: { circleId },
          },
        },
        OR: [{ marriageDate: { not: null } }, { baptismDate: { not: null } }, { confirmationDate: { not: null } }],
      },
      include: { user: true },
    }),
  ]);

  const prevMonth = format(addMonths(monthStart, -1), "yyyy-MM");
  const nextMonth = format(addMonths(monthStart, 1), "yyyy-MM");
  const holidays = getHolidayEntriesForMonth(monthStart.getFullYear(), monthStart.getMonth());
  const gridDates = getMonthGridDates(monthStart);
  const selectedDay = day;

  const itemsByDay = new Map<string, DayItem[]>();
  const pushDayItem = (dateKey: string, item: DayItem) => {
    const list = itemsByDay.get(dateKey) ?? [];
    list.push(item);
    itemsByDay.set(dateKey, list);
  };

  for (const event of events) {
    const dateKey = toEventDateKey(event.startsAt, effectiveTimeZone);
    pushDayItem(dateKey, {
      id: event.id,
      kind: "event",
      label: event.title,
      href: `/cercles/${circleId}/evenements/${event.id}`,
      timeLabel: formatEventTime(event.startsAt, effectiveTimeZone),
      timeRangeLabel: event.endsAt
        ? `${formatEventTime(event.startsAt, effectiveTimeZone)} - ${formatEventTime(event.endsAt, effectiveTimeZone)}`
        : `${formatEventTime(event.startsAt, effectiveTimeZone)} - fin non definie`,
    });
  }

  for (const profile of birthdays) {
    if (!profile.birthDate) continue;
    const birthDate = new Date(profile.birthDate);
    if (birthDate.getMonth() !== monthStart.getMonth()) continue;
    const dateKey = format(new Date(monthStart.getFullYear(), monthStart.getMonth(), birthDate.getDate()), "yyyy-MM-dd");
    pushDayItem(dateKey, {
      id: `birthday-${profile.id}`,
      kind: "birthday",
      label: `Anniversaire: ${profile.firstName}`,
    });
  }

  for (const profile of importantDates) {
    const candidates = [
      { date: profile.marriageDate, label: "Anniversaire de mariage" },
      { date: profile.baptismDate, label: "Bapteme" },
      { date: profile.confirmationDate, label: "Confirmation" },
    ];

    for (const candidate of candidates) {
      if (!candidate.date) continue;
      const d = new Date(candidate.date);
      if (d.getMonth() !== monthStart.getMonth()) continue;
      const dateKey = format(new Date(monthStart.getFullYear(), monthStart.getMonth(), d.getDate()), "yyyy-MM-dd");
      pushDayItem(dateKey, {
        id: `important-${profile.id}-${candidate.label}`,
        kind: "important",
        label: `${candidate.label}: ${profile.firstName}`,
      });
    }
  }

  for (const holiday of holidays) {
    const dateKey = format(holiday.date, "yyyy-MM-dd");
    pushDayItem(dateKey, {
      id: `holiday-${holiday.label}`,
      kind: "holiday",
      label: holiday.label,
    });
  }

  const selectedDateKey = selectedDay && /^\d{4}-\d{2}-\d{2}$/.test(selectedDay) ? selectedDay : format(monthStart, "yyyy-MM-dd");
  const selectedItems = itemsByDay.get(selectedDateKey) ?? [];
  const selectedDateLabel = format(parseISO(selectedDateKey), "EEEE d MMMM yyyy", { locale: frCA });

  const dayNameLabels = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

  return (
    <AppShell title="Calendrier">
      <Card className="bg-gradient-to-br from-white to-indigo-50/50">
        <div className="flex items-center justify-between">
          <Link className="rounded-full bg-white px-3 py-1 text-sm font-semibold text-zinc-700 shadow-sm hover:bg-zinc-50" href={`/cercles/${circleId}/calendrier?month=${prevMonth}&type=${selectedType}`}>
            Mois precedent
          </Link>
          <p className="font-serif text-lg font-bold capitalize text-zinc-900">{monthLabel}</p>
          <Link className="rounded-full bg-white px-3 py-1 text-sm font-semibold text-zinc-700 shadow-sm hover:bg-zinc-50" href={`/cercles/${circleId}/calendrier?month=${nextMonth}&type=${selectedType}`}>
            Mois suivant
          </Link>
        </div>
        <div className="mt-3">
          <label className="mb-1 block text-xs text-zinc-500">Filtre type</label>
          <div className="flex flex-wrap gap-2 text-xs">
            {["ALL", "ANNIVERSAIRE", "SOUPER_FAMILIAL", "NOEL", "AUTRE"].map((eventType) => (
              <Link
                key={eventType}
                href={`/cercles/${circleId}/calendrier?month=${monthKey}&type=${eventType}`}
                className={`rounded-full border px-3 py-1 font-semibold ${selectedType === eventType ? "border-indigo-200 bg-indigo-50 text-indigo-700" : "border-zinc-200 bg-white text-zinc-600"}`}
              >
                {eventType}
              </Link>
            ))}
          </div>
        </div>
      </Card>

      <Card>
        <p className="mb-2 text-sm font-medium">Vue mensuelle</p>
        <div className="mb-1 grid grid-cols-7 gap-1 text-[11px] font-semibold text-zinc-500">
          {dayNameLabels.map((dayName) => (
            <div key={dayName} className="rounded-lg bg-zinc-50 px-1 py-1 text-center">
              {dayName}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1 text-xs">
          {gridDates.map((dayDate) => {
            const dateKey = format(dayDate, "yyyy-MM-dd");
            const dayItems = itemsByDay.get(dateKey) ?? [];
            const visibleItems = dayItems.slice(0, 2);
            const hiddenCount = Math.max(0, dayItems.length - visibleItems.length);
            const isCurrentMonth = isSameMonth(dayDate, monthStart);
            const dayLink = `/cercles/${circleId}/calendrier/jour/${dateKey}`;

            return (
              <div key={dateKey} className={`min-h-20 rounded-xl border p-1.5 transition-colors ${isCurrentMonth ? "border-indigo-100 bg-white" : "border-zinc-100 bg-zinc-50"} ${selectedDateKey === dateKey ? "ring-2 ring-indigo-200" : ""}`}>
                <p className={`text-[11px] font-semibold ${isToday(dayDate) ? "text-indigo-700" : isCurrentMonth ? "text-zinc-700" : "text-zinc-400"}`}>
                  <Link href={dayLink} className={`inline-flex h-6 w-6 items-center justify-center rounded-full underline-offset-2 hover:underline ${isToday(dayDate) ? "bg-indigo-100" : ""}`}>
                    {format(dayDate, "d")}
                  </Link>
                </p>
                {visibleItems.map((item) => (
                  item.href ? (
                    <Link
                      key={item.id}
                      href={item.href}
                      className={`mt-0.5 block truncate rounded-md px-1 py-0.5 text-[10px] font-medium ${
                        item.kind === "event"
                          ? "bg-indigo-100 text-indigo-800"
                          : item.kind === "holiday"
                            ? "bg-amber-100 text-amber-900"
                            : item.kind === "birthday"
                              ? "bg-pink-100 text-pink-800"
                              : "bg-zinc-100 text-zinc-700"
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
                          : item.kind === "holiday"
                            ? "bg-amber-100 text-amber-900"
                            : item.kind === "birthday"
                              ? "bg-pink-100 text-pink-800"
                              : "bg-zinc-100 text-zinc-700"
                      }`}
                    >
                      {item.timeLabel ? `${item.timeLabel} ` : ""}
                      {item.label}
                    </div>
                  )
                ))}
                {hiddenCount > 0 ? <p className="mt-0.5 text-[10px] font-medium text-zinc-500">+ {hiddenCount} autres</p> : null}
              </div>
            );
          })}
        </div>
      </Card>

      <Card className="bg-gradient-to-br from-white to-amber-50/40">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Jour selectionne</p>
            <p className="text-sm font-semibold capitalize text-zinc-800">{selectedDateLabel}</p>
            <Link href={`/cercles/${circleId}/calendrier/jour/${selectedDateKey}`} className="mt-1 inline-block text-xs font-semibold text-indigo-700 underline underline-offset-2">
              Voir la journee
            </Link>
          </div>
          <Link
            href={`/cercles/${circleId}/evenements/nouveau?date=${selectedDateKey}`}
            className="rounded-xl bg-indigo-600 px-3 py-2 text-xs font-semibold text-white shadow-sm shadow-indigo-200 transition-colors hover:bg-indigo-500"
          >
            Ajouter un evenement
          </Link>
        </div>
        {selectedItems.length === 0 ? <p className="rounded-2xl border border-zinc-200 bg-white px-3 py-3 text-sm text-zinc-600">Aucun element ce jour-la.</p> : null}
        <div className="space-y-2">
          {selectedItems.map((item) => (
            <div key={item.id} className="rounded-2xl border border-zinc-200/80 bg-white px-3 py-3">
              <p className="text-sm font-semibold text-zinc-900">{item.label}</p>
              {item.timeRangeLabel ? <p className="text-xs text-zinc-600">Horaire: {item.timeRangeLabel}</p> : null}
              {item.href ? (
                <Link href={item.href} className="mt-1 inline-block text-xs font-semibold text-indigo-700 underline">
                  Ouvrir le detail
                </Link>
              ) : null}
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <p className="mb-2 text-sm font-medium">Anniversaires et dates importantes</p>
        <div className="space-y-1 text-sm text-zinc-700">
          {birthdays.map((profile) => (
            <p key={`b-${profile.id}`}>
              Anniversaire: {profile.firstName} {profile.lastName} ({profile.birthDate ? new Date(profile.birthDate).toLocaleDateString("fr-CA", { month: "long", day: "numeric" }) : "-"})
            </p>
          ))}
          {importantDates.map((profile) => (
            <p key={`i-${profile.id}`}>Dates familiales: {profile.firstName} {profile.lastName}</p>
          ))}
          {holidays.map((holiday) => (
            <p key={holiday.label}>Fete/Jour ferie: {holiday.label}</p>
          ))}
        </div>
      </Card>
    </AppShell>
  );
}
