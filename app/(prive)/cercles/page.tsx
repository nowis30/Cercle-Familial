import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CreateCircleForm } from "@/components/circles/create-circle-form";
import { AppShell } from "@/components/layout/app-shell";
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
      <CreateCircleForm />
      {memberships.map(({ circle }) => (
        <Link key={circle.id} href={`/cercles/${circle.id}`}>
          <Card className="active:scale-[0.99]">
            <p className="font-medium">{circle.name}</p>
            {circle.description ? <p className="mt-1 text-xs text-zinc-500">{circle.description}</p> : null}
          </Card>
        </Link>
      ))}
    </AppShell>
  );
}
