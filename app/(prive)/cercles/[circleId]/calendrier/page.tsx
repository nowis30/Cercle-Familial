import Link from "next/link";
import { redirect } from "next/navigation";

import { AppShell } from "@/components/layout/app-shell";
import { Card } from "@/components/ui/card";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function getHolidayEntries(year: number, monthIndex: number) {
  const all = [
    { label: "Jour de l'An", date: new Date(year, 0, 1) },
    { label: "Fete nationale (QC)", date: new Date(year, 5, 24) },
    { label: "Fete du Canada", date: new Date(year, 6, 1) },
    { label: "Noel", date: new Date(year, 11, 25) },
    { label: "Paques", date: new Date(year, 3, 5) },
  ];

  return all.filter((entry) => entry.date.getMonth() === monthIndex);
}

export default async function CalendrierPage({
  params,
  searchParams,
}: {
  params: Promise<{ circleId: string }>;
  searchParams: Promise<{ month?: string; type?: string }>;
}) {
  const { circleId } = await params;
  const { month, type } = await searchParams;
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

  const now = month ? new Date(`${month}-01T00:00:00`) : new Date();
  const currentMonth = Number.isNaN(now.getTime()) ? new Date() : now;
  const monthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
  const monthEnd = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
  const monthLabel = monthStart.toLocaleDateString("fr-CA", { month: "long", year: "numeric" });

  const selectedType = type ?? "ALL";
  const eventWhereType = selectedType === "ALL" ? undefined : selectedType;

  const [events, birthdays, importantDates] = await Promise.all([
    prisma.event.findMany({
      where: {
        circleId,
        startsAt: { gte: monthStart, lte: new Date(monthEnd.getFullYear(), monthEnd.getMonth(), monthEnd.getDate(), 23, 59, 59) },
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

  const prevMonth = new Date(monthStart.getFullYear(), monthStart.getMonth() - 1, 1).toISOString().slice(0, 7);
  const nextMonth = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 1).toISOString().slice(0, 7);
  const holidays = getHolidayEntries(monthStart.getFullYear(), monthStart.getMonth());

  const days = Array.from({ length: monthEnd.getDate() }, (_, index) => index + 1);

  const eventsByDay = new Map<number, typeof events>();
  for (const event of events) {
    const day = new Date(event.startsAt).getDate();
    const list = eventsByDay.get(day) ?? [];
    list.push(event);
    eventsByDay.set(day, list);
  }

  return (
    <AppShell title="Calendrier">
      <Card>
        <div className="flex items-center justify-between">
          <Link className="text-sm text-zinc-600 underline" href={`/cercles/${circleId}/calendrier?month=${prevMonth}&type=${selectedType}`}>
            Mois precedent
          </Link>
          <p className="text-sm font-semibold capitalize">{monthLabel}</p>
          <Link className="text-sm text-zinc-600 underline" href={`/cercles/${circleId}/calendrier?month=${nextMonth}&type=${selectedType}`}>
            Mois suivant
          </Link>
        </div>
        <div className="mt-3">
          <label className="mb-1 block text-xs text-zinc-500">Filtre type</label>
          <div className="flex flex-wrap gap-2 text-xs">
            {["ALL", "ANNIVERSAIRE", "SOUPER_FAMILIAL", "NOEL", "AUTRE"].map((eventType) => (
              <Link
                key={eventType}
                href={`/cercles/${circleId}/calendrier?month=${monthStart.toISOString().slice(0, 7)}&type=${eventType}`}
                className={`rounded-full px-3 py-1 ${selectedType === eventType ? "bg-emerald-100 text-emerald-800" : "bg-zinc-100 text-zinc-700"}`}
              >
                {eventType}
              </Link>
            ))}
          </div>
        </div>
      </Card>

      <Card>
        <p className="mb-2 text-sm font-medium">Vue mensuelle</p>
        <div className="grid grid-cols-7 gap-1 text-xs">
          {days.map((day) => {
            const dayEvents = eventsByDay.get(day) ?? [];
            return (
              <div key={day} className="min-h-16 rounded-lg border border-zinc-200 bg-white p-1">
                <p className="text-[11px] font-semibold text-zinc-700">{day}</p>
                {dayEvents.slice(0, 2).map((event) => (
                  <Link key={event.id} href={`/cercles/${circleId}/evenements/${event.id}`} className="block truncate text-[10px] text-emerald-700 underline">
                    {event.title}
                  </Link>
                ))}
              </div>
            );
          })}
        </div>
      </Card>

      <Card>
        <p className="mb-2 text-sm font-medium">Evenements du mois</p>
        {events.length === 0 ? <p className="text-sm text-zinc-600">Aucun evenement pour ce mois.</p> : null}
        <div className="space-y-2">
          {events.map((event) => (
            <Link key={event.id} href={`/cercles/${circleId}/evenements/${event.id}`} className="block rounded-xl bg-zinc-50 px-3 py-2">
              <p className="text-sm font-medium">{event.title}</p>
              <p className="text-xs text-zinc-600">{new Date(event.startsAt).toLocaleString("fr-CA")}</p>
            </Link>
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
