import { redirect } from "next/navigation";

import { AppShell } from "@/components/layout/app-shell";
import { PrivateChat } from "@/components/chat/private-chat";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function ConversationPage({ params }: { params: Promise<{ conversationId: string }> }) {
  const { conversationId } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/connexion");
  }

  const participant = await prisma.directConversationParticipant.findUnique({
    where: {
      conversationId_userId: {
        conversationId,
        userId: session.user.id,
      },
    },
  });
  if (!participant) {
    redirect("/messages");
  }

  const conversation = await prisma.directConversation.findUnique({
    where: { id: conversationId },
    include: {
      participants: {
        include: { user: true },
      },
      messages: {
        include: { sender: true },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!conversation) {
    redirect("/messages");
  }

  const other = conversation.participants.find((p) => p.userId !== session.user.id);

  return (
    <AppShell title={other?.user.name ?? "Conversation"}>
      <PrivateChat
        conversationId={conversation.id}
        messages={conversation.messages.map((message) => ({
          id: message.id,
          author: message.sender.name,
          content: message.content,
          at: new Date(message.createdAt).toLocaleTimeString("fr-CA", { hour: "2-digit", minute: "2-digit" }),
        }))}
      />
    </AppShell>
  );
}
