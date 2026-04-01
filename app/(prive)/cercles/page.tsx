import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/layout/app-shell";
import { CircleSwitcher } from "@/components/layout/circle-switcher";
import { EmptyState } from "@/components/shared/empty-state";
import { Card } from "@/components/ui/card";

export default async function CerclesPage({
  searchParams,
}: {
  searchParams: Promise<{ circleId?: string }>;
}) {
  const session = await auth();
  const { circleId: selectedCircleId } = await searchParams;

  if (!session?.user?.id) {
    redirect("/connexion");
  }

  const memberships = await prisma.circleMembership.findMany({
    where: { userId: session.user.id },
    include: { circle: true },
    orderBy: { createdAt: "asc" },
  });

  const activeMembership = memberships.find((membership) => membership.circle.id === selectedCircleId) ?? memberships[0];
  const activeCircle = activeMembership?.circle;

  return (
    <AppShell title="Mes cercles">
      {/* Bouton "Créer un cercle" toujours visible en haut */}
      <Link
        href="/cercles/nouveau"
        className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-indigo-200 transition-colors hover:bg-indigo-500"
      >
        + Créer un cercle
      </Link>

      {memberships.length === 0 ? (
        <EmptyState title="Aucun cercle" description="Créez votre premier cercle pour commencer à organiser votre famille." />
      ) : (
        <>
          <CircleSwitcher
            circles={memberships.map(({ circle }) => ({
              id: circle.id,
              name: circle.name,
              photoUrl: circle.photoUrl,
              description: circle.description,
            }))}
            currentCircleId={activeCircle.id}
            navigateBasePath="/cercles"
            queryParamName="circleId"
          />

          <Card>
            <p className="font-semibold text-zinc-900">Accès rapides – {activeCircle.name}</p>
            <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
              <Link href={`/cercles/${activeCircle.id}`} className="col-span-2 rounded-2xl border border-indigo-100 bg-indigo-50/70 px-3 py-3 font-semibold text-indigo-800 transition-colors hover:bg-indigo-100 text-center">
                Ouvrir le cercle →
              </Link>
              <Link href={`/cercles/${activeCircle.id}/calendrier`} className="rounded-2xl border border-zinc-200 bg-white px-3 py-3 font-semibold text-zinc-700 transition-colors hover:bg-zinc-50">
                Calendrier
              </Link>
              <Link href={`/cercles/${activeCircle.id}/discussion`} className="rounded-2xl border border-zinc-200 bg-white px-3 py-3 font-semibold text-zinc-700 transition-colors hover:bg-zinc-50">
                Discussion
              </Link>
              <Link href={`/cercles/${activeCircle.id}/membres`} className="rounded-2xl border border-zinc-200 bg-white px-3 py-3 font-semibold text-zinc-700 transition-colors hover:bg-zinc-50">
                Membres
              </Link>
              <Link href={`/cercles/${activeCircle.id}/modifier`} className="rounded-2xl border border-zinc-200 bg-white px-3 py-3 font-semibold text-zinc-700 transition-colors hover:bg-zinc-50">
                Paramètres du cercle
              </Link>
            </div>
          </Card>
        </>
      )}
    </AppShell>
  );
}
