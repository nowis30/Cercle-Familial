import { redirect } from "next/navigation";

import { CircleDiscussionPanel } from "@/components/circles/circle-discussion-panel";
import { AppShell } from "@/components/layout/app-shell";
import { auth } from "@/lib/auth";
import { canManageCircle } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export default async function DiscussionPage({ params }: { params: Promise<{ circleId: string }> }) {
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
    include: { circle: true },
  });

  if (!membership) {
    redirect("/cercles");
  }

  const messages = await prisma.circleMessage.findMany({
    where: { circleId },
    include: { author: true },
    orderBy: { createdAt: "desc" },
    take: 30,
  });

  return (
    <AppShell title={`Discussion: ${membership.circle.name}`}>
      <CircleDiscussionPanel
        circleId={circleId}
        messages={messages.map((message) => ({
          id: message.id,
          author: message.author.name,
          content: message.content,
          at: new Date(message.createdAt).toLocaleTimeString("fr-CA", { hour: "2-digit", minute: "2-digit" }),
          canDelete: canManageCircle(membership.role),
        }))}
      />
    </AppShell>
  );
}
