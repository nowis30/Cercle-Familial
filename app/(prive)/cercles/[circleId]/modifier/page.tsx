import { redirect } from "next/navigation";

import { CreateCircleForm } from "@/components/circles/create-circle-form";
import { AppShell } from "@/components/layout/app-shell";
import { Card } from "@/components/ui/card";
import { auth } from "@/lib/auth";
import { canManageCircle } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export default async function ModifierCerclePage({
  params,
}: {
  params: Promise<{ circleId: string }>;
}) {
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

  if (!membership || !canManageCircle(membership.role)) {
    redirect(`/cercles/${circleId}`);
  }

  const circle = await prisma.circle.findUnique({ where: { id: circleId } });
  if (!circle) {
    redirect("/cercles");
  }

  return (
    <AppShell title="Modifier cercle">
      <Card className="bg-gradient-to-br from-white to-indigo-50/60">
        <p className="font-serif text-lg font-bold text-zinc-900">Modifier le cercle</p>
        <p className="mt-1 text-sm text-zinc-600">Mettez a jour les informations du cercle sans toucher aux membres existants.</p>
      </Card>
      <CreateCircleForm
        mode="edit"
        circleId={circle.id}
        initialValues={{
          name: circle.name,
          photoUrl: circle.photoUrl ?? "",
          description: circle.description ?? "",
          rules: circle.rules ?? "",
          invitePermission: circle.invitePermission,
        }}
      />
    </AppShell>
  );
}
