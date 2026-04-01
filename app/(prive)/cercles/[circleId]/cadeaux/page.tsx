import Link from "next/link";
import { redirect } from "next/navigation";

import { GiftDrawCard } from "@/components/events/gift-draw-card";
import { AppShell } from "@/components/layout/app-shell";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function CadeauxPage({ params }: { params: Promise<{ circleId: string }> }) {
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

  if (!membership) {
    redirect("/cercles");
  }

  const giftExchanges = await prisma.giftExchange.findMany({
    where: { circleId },
    orderBy: { drawDate: "asc" },
    include: {
      assignments: {
        where: { giverUserId: session.user.id },
        include: { receiverUser: true },
        take: 1,
      },
    },
  });

  return (
    <AppShell title="Pige de cadeaux">
      {giftExchanges.length === 0 ? (
        <p className="rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-3 text-sm text-zinc-600">Aucune pige configuree pour ce cercle.</p>
      ) : null}

      {giftExchanges.map((exchange) => {
        const myAssignment = exchange.assignments[0];

        return (
          <div key={exchange.id} className="space-y-2">
            <GiftDrawCard
              title={exchange.title}
              drawDate={new Date(exchange.drawDate).toLocaleDateString("fr-CA", { year: "numeric", month: "long", day: "numeric" })}
              recipientName={myAssignment?.receiverUser.name}
            />
            <Link href={`/cercles/${circleId}/cadeaux/${exchange.id}`} className="inline-flex rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50">
              Ouvrir le detail de la pige
            </Link>
          </div>
        );
      })}
    </AppShell>
  );
}
