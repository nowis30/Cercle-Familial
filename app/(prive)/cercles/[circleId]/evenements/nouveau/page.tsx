import { redirect } from "next/navigation";

import { CreateEventForm } from "@/components/events/create-event-form";
import { AppShell } from "@/components/layout/app-shell";
import { Card } from "@/components/ui/card";
import { auth } from "@/lib/auth";
import { canCreateEvent } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export default async function NouvelEvenementPage({
  params,
  searchParams,
}: {
  params: Promise<{ circleId: string }>;
  searchParams: Promise<{ date?: string }>;
}) {
  const { circleId } = await params;
  const { date } = await searchParams;
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

  if (!membership || !canCreateEvent(membership.role)) {
    redirect(`/cercles/${circleId}`);
  }

  const members = await prisma.circleMembership.findMany({
    where: { circleId },
    include: { user: true },
    orderBy: { createdAt: "asc" },
  });

  const initialStartsAt = date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? `${date}T18:00` : undefined;

  return (
    <AppShell title="Nouvel evenement">
      <Card className="bg-gradient-to-br from-white to-amber-50/60">
        <p className="font-serif text-lg font-bold text-zinc-900">Organiser un nouvel evenement</p>
        <p className="mt-1 text-sm text-zinc-600">Creez un rendez-vous clair avec invites, lieu, date et details utiles.</p>
      </Card>
      <CreateEventForm
        circleId={circleId}
        initialStartsAt={initialStartsAt}
        members={members.map((member) => ({
          id: member.userId,
          name: member.user.name,
        }))}
      />
    </AppShell>
  );
}
