import { redirect } from "next/navigation";

import { CreateEventForm } from "@/components/events/create-event-form";
import { AppShell } from "@/components/layout/app-shell";
import { auth } from "@/lib/auth";
import { canCreateEvent } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export default async function NouvelEvenementPage({ params }: { params: Promise<{ circleId: string }> }) {
  const { circleId } = await params;
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

  return (
    <AppShell title="Nouvel evenement">
      <CreateEventForm
        circleId={circleId}
        members={members.map((member) => ({
          id: member.userId,
          name: member.user.name,
        }))}
      />
    </AppShell>
  );
}
