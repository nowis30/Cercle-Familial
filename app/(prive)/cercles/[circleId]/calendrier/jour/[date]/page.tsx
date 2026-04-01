import Link from "next/link";
import { redirect } from "next/navigation";
import { format, parseISO } from "date-fns";
import { frCA } from "date-fns/locale";

import { AppShell } from "@/components/layout/app-shell";
import { Card } from "@/components/ui/card";
import { auth } from "@/lib/auth";
import { getHolidayEntriesForMonth } from "@/lib/calendar";
import { formatEventTime, getUtcRangeForEventDay } from "@/lib/event-datetime";
import { prisma } from "@/lib/prisma";

function isSameMonthDay(dateA: Date, dateB: Date) {
  return dateA.getMonth() === dateB.getMonth() && dateA.getDate() === dateB.getDate();
}

export default async function JourCalendrierPage({
  params,
}: {
  params: Promise<{ circleId: string; date: string }>;
}) {
  const { circleId, date } = await params;
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

  const isDateFormatValid = /^\d{4}-\d{2}-\d{2}$/.test(date);
  const selectedDate = parseISO(date);
  const isValidDate = isDateFormatValid && !Number.isNaN(selectedDate.getTime()) && format(selectedDate, "yyyy-MM-dd") === date;

  if (!isValidDate) {
    redirect(`/cercles/${circleId}/calendrier`);
  }

  const dayUtcRange = getUtcRangeForEventDay(date);

  const [events, birthdays, importantDates] = await Promise.all([
    prisma.event.findMany({
      where: {
        circleId,
        startsAt: {
          gte: dayUtcRange.start,
          lte: dayUtcRange.end,
        },
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
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
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
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
    }),
  ]);

  const dayBirthdays = birthdays.filter((profile) => profile.birthDate && isSameMonthDay(new Date(profile.birthDate), selectedDate));

  const dayImportantDates = importantDates.flatMap((profile) => {
    const entries = [
      { date: profile.marriageDate, label: "Anniversaire de mariage" },
      { date: profile.baptismDate, label: "Bapteme" },
      { date: profile.confirmationDate, label: "Confirmation" },
    ];

    return entries
      .filter((entry) => entry.date && isSameMonthDay(new Date(entry.date), selectedDate))
      .map((entry) => ({
        id: `${profile.id}-${entry.label}`,
        label: `${entry.label}: ${profile.firstName} ${profile.lastName}`,
      }));
  });

  const dayHolidays = getHolidayEntriesForMonth(selectedDate.getFullYear(), selectedDate.getMonth()).filter((holiday) =>
    isSameMonthDay(holiday.date, selectedDate),
  );

  const hasAnyItem = events.length > 0 || dayBirthdays.length > 0 || dayImportantDates.length > 0 || dayHolidays.length > 0;

  return (
    <AppShell title="Journee">
      <Card className="bg-gradient-to-br from-white to-indigo-50/40">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Vue journee</p>
            <h1 className="font-serif text-xl font-bold capitalize text-zinc-900">{format(selectedDate, "EEEE d MMMM yyyy", { locale: frCA })}</h1>
            <Link
              href={`/cercles/${circleId}/calendrier?month=${format(selectedDate, "yyyy-MM")}`}
              className="mt-1 inline-block text-xs font-semibold text-zinc-600 underline underline-offset-2"
            >
              Retour au calendrier
            </Link>
          </div>
          <div className="flex flex-col items-end gap-2">
            <Link
              href={`/cercles/${circleId}/evenements/nouveau?date=${format(selectedDate, "yyyy-MM-dd")}`}
              className="rounded-xl bg-indigo-600 px-3 py-2 text-xs font-semibold text-white shadow-sm shadow-indigo-200 transition-colors hover:bg-indigo-500"
            >
              Ajouter un evenement
            </Link>
            <Link
              href={`/profil?birthDate=${format(selectedDate, "yyyy-MM-dd")}`}
              className="rounded-xl border border-pink-200 bg-pink-50 px-3 py-2 text-xs font-semibold text-pink-700 transition-colors hover:bg-pink-100"
            >
              Ajouter un anniversaire
            </Link>
          </div>
        </div>
      </Card>

      <Card>
        <p className="mb-2 text-sm font-semibold text-zinc-900">Activites du jour</p>
        {!hasAnyItem ? (
          <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-4 text-sm text-zinc-600">
            Rien de prevu pour cette journee.
          </div>
        ) : (
          <div className="space-y-2">
            {events.map((event) => (
              <Link
                key={event.id}
                href={`/cercles/${circleId}/evenements/${event.id}`}
                className="block rounded-2xl border border-indigo-100 bg-indigo-50/40 px-3 py-3"
              >
                <p className="text-sm font-semibold text-zinc-900">{event.title}</p>
                <p className="text-xs text-zinc-600">
                  {formatEventTime(event.startsAt)}
                  {event.endsAt ? ` - ${formatEventTime(event.endsAt)}` : " - fin non definie"}
                  {event.locationName ? ` - ${event.locationName}` : ""}
                </p>
              </Link>
            ))}

            {dayBirthdays.map((profile) => (
              <div key={`birthday-${profile.id}`} className="rounded-2xl border border-pink-100 bg-pink-50/60 px-3 py-3">
                <p className="text-sm font-semibold text-zinc-900">Anniversaire</p>
                <p className="text-xs text-zinc-700">
                  {profile.firstName} {profile.lastName}
                </p>
              </div>
            ))}

            {dayImportantDates.map((item) => (
              <div key={`important-${item.id}`} className="rounded-2xl border border-amber-100 bg-amber-50/60 px-3 py-3">
                <p className="text-sm font-semibold text-zinc-900">{item.label}</p>
              </div>
            ))}

            {dayHolidays.map((holiday) => (
              <div key={`holiday-${holiday.label}`} className="rounded-2xl border border-emerald-100 bg-emerald-50/60 px-3 py-3">
                <p className="text-sm font-semibold text-zinc-900">Fete / Jour ferie</p>
                <p className="text-xs text-zinc-700">{holiday.label}</p>
              </div>
            ))}
          </div>
        )}
      </Card>
    </AppShell>
  );
}
