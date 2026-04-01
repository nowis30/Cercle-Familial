import Link from "next/link";
import { redirect } from "next/navigation";

import { AppShell } from "@/components/layout/app-shell";
import { NewConversationForm } from "@/components/messages/new-conversation-form";
import { EmptyState } from "@/components/shared/empty-state";
import { Card } from "@/components/ui/card";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function MessagesPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/connexion");
  }

  const [participants, conversations] = await Promise.all([
    prisma.circleMembership.findMany({
      where: {
        circle: {
          memberships: {
            some: { userId: session.user.id },
          },
        },
        userId: { not: session.user.id },
      },
      include: { user: true },
      distinct: ["userId"],
      take: 50,
    }),
    prisma.directConversationParticipant.findMany({
      where: { userId: session.user.id },
      include: {
        conversation: {
          include: {
            messages: {
              orderBy: { createdAt: "desc" },
              take: 1,
            },
            participants: {
              include: {
                user: true,
              },
            },
          },
        },
      },
      orderBy: { joinedAt: "desc" },
    }),
  ]);

  return (
    <AppShell title="Messages prives">
      <NewConversationForm targets={participants.map((participant) => ({ id: participant.userId, name: participant.user.name }))} />

      {conversations.length === 0 ? (
        <EmptyState title="Aucune conversation" description="Demarrez une conversation privee avec un membre de vos cercles." />
      ) : null}

      {conversations.map((entry) => {
        const other = entry.conversation.participants.find((participant) => participant.userId !== session.user.id);
        const lastMessage = entry.conversation.messages[0];
        return (
          <Link key={entry.conversation.id} href={`/messages/${entry.conversation.id}`}>
            <Card className="transition-shadow hover:shadow-[0_12px_22px_-18px_rgba(30,64,175,0.45)]">
              <p className="font-semibold text-zinc-900">{other?.user.name ?? "Conversation"}</p>
              <p className="mt-1 line-clamp-2 text-sm text-zinc-600">{lastMessage?.content ?? "Aucun message"}</p>
            </Card>
          </Link>
        );
      })}
    </AppShell>
  );
}
