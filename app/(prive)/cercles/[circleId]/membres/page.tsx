import { redirect } from "next/navigation";

import { AppShell } from "@/components/layout/app-shell";
import { MemberCard } from "@/components/members/member-card";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function MembresPage({ params }: { params: Promise<{ circleId: string }> }) {
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

  const members = await prisma.circleMembership.findMany({
    where: { circleId },
    include: {
      user: {
        include: {
          profile: true,
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  return (
    <AppShell title="Membres du cercle">
      {members.map((member) => (
        <MemberCard
          key={member.id}
          name={member.user.name}
          role={member.role}
          note={member.user.profile?.familyRoleLabel ?? member.user.profile?.allergies ?? undefined}
        />
      ))}
    </AppShell>
  );
}
