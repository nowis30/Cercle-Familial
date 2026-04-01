import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CreateCircleForm } from "@/components/circles/create-circle-form";
import { AppShell } from "@/components/layout/app-shell";
import { EmptyState } from "@/components/shared/empty-state";
import { Card } from "@/components/ui/card";

export default async function CerclesPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/connexion");
  }

  const memberships = await prisma.circleMembership.findMany({
    where: { userId: session.user.id },
    include: { circle: true },
    orderBy: { createdAt: "asc" },
  });

  return (
    <AppShell title="Mes cercles">
      <Card className="bg-gradient-to-br from-white to-indigo-50/60">
        <p className="font-serif text-lg font-bold text-zinc-900">Vos espaces familiaux</p>
        <p className="mt-1 text-sm text-zinc-600">Retrouvez rapidement vos discussions, calendriers et evenements par cercle.</p>
      </Card>
      <CreateCircleForm />
      {memberships.length === 0 ? <EmptyState title="Aucun cercle" description="Creez votre premier cercle pour commencer a organiser votre famille." /> : null}
      {memberships.map(({ circle }) => (
        <Link key={circle.id} href={`/cercles/${circle.id}`}>
          <Card className="transition-shadow hover:shadow-[0_12px_26px_-20px_rgba(30,64,175,0.45)]">
            <p className="font-semibold text-zinc-900">{circle.name}</p>
            {circle.description ? <p className="mt-1 line-clamp-2 text-xs text-zinc-500">{circle.description}</p> : null}
          </Card>
        </Link>
      ))}
    </AppShell>
  );
}
