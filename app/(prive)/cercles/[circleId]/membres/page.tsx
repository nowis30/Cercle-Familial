import { redirect } from "next/navigation";

import { AppShell } from "@/components/layout/app-shell";
import { MemberCard } from "@/components/members/member-card";
import { RemoveMemberButton } from "@/components/members/remove-member-button";
import { auth } from "@/lib/auth";
import { canManageCircle } from "@/lib/permissions";
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

  const isAdmin = canManageCircle(membership.role);

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

  const adminCount = members.filter((m) => m.role === "ADMIN").length;

  return (
    <AppShell title="Membres du cercle">
      {members.map((member) => {
        const isCurrentUser = member.userId === session.user.id;
        const isLastAdmin = member.role === "ADMIN" && adminCount <= 1;
        const canRemove = isAdmin && !isCurrentUser && !isLastAdmin;

        return (
          <div key={member.id} className="flex items-start gap-2">
            <div className="flex-1 min-w-0">
              <MemberCard
                name={member.user.name}
                role={member.role}
                note={member.user.profile?.familyRoleLabel ?? member.user.profile?.allergies ?? undefined}
              />
            </div>
            {canRemove && (
              <div className="pt-1 shrink-0">
                <RemoveMemberButton
                  circleId={circleId}
                  targetUserId={member.userId}
                  memberName={member.user.name}
                />
              </div>
            )}
          </div>
        );
      })}
    </AppShell>
  );
}
