import { redirect } from "next/navigation";

import { AppShell } from "@/components/layout/app-shell";
import { GiftDrawCard } from "@/components/events/gift-draw-card";
import { Card } from "@/components/ui/card";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function CadeauDetailPage({
  params,
}: {
  params: Promise<{ circleId: string; drawId: string }>;
}) {
  const { circleId, drawId } = await params;
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

  const giftExchange = await prisma.giftExchange.findFirst({
    where: {
      id: drawId,
      circleId,
    },
    include: {
      participants: {
        include: { user: true },
        orderBy: { createdAt: "asc" },
      },
      assignments: {
        include: {
          giverUser: true,
          receiverUser: true,
        },
      },
    },
  });

  if (!giftExchange) {
    redirect(`/cercles/${circleId}/cadeaux`);
  }

  const myAssignment = giftExchange.assignments.find((assignment) => assignment.giverUserId === session.user.id);

  return (
    <AppShell title="Detail de la pige">
      <GiftDrawCard
        title={giftExchange.title}
        drawDate={new Date(giftExchange.drawDate).toLocaleDateString("fr-CA", { year: "numeric", month: "long", day: "numeric" })}
        recipientName={myAssignment?.receiverUser.name}
      />
      <Card>
        <p className="text-sm font-semibold text-zinc-900">Participants: {giftExchange.participants.length}</p>
        <p className="mt-1 text-sm text-zinc-600">Attributions generees: {giftExchange.assignments.length}</p>
        {myAssignment ? <p className="mt-1 text-sm text-zinc-700">Ta personne a gater: {myAssignment.receiverUser.name}</p> : <p className="mt-1 text-sm text-zinc-700">Aucune attribution pour toi pour le moment.</p>}
      </Card>
    </AppShell>
  );
}
