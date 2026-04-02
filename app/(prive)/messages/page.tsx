import { redirect } from "next/navigation";

import { AppShell } from "@/components/layout/app-shell";
import { ConversationList } from "@/components/messages/conversation-list";
import { NewConversationForm } from "@/components/messages/new-conversation-form";
import { EmptyState } from "@/components/shared/empty-state";
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
      ) : (
        <ConversationList
          items={conversations.map((entry) => {
            const other = entry.conversation.participants.find((participant) => participant.userId !== session.user.id);
            const lastMessage = entry.conversation.messages[0];

            return {
              id: entry.conversation.id,
              name: other?.user.name ?? "Conversation",
              lastMessage: lastMessage?.content ?? "Aucun message",
            };
          })}
        />
      )}
    </AppShell>
  );
}
