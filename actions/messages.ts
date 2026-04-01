"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const openConversationSchema = z.object({
  targetUserId: z.string().min(1),
});

export async function openOrCreateConversationAction(input: z.infer<typeof openConversationSchema>) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, message: "Session invalide." };
  }

  const parsed = openConversationSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, message: "Utilisateur cible invalide." };
  }

  if (parsed.data.targetUserId === session.user.id) {
    return { success: false, message: "Impossible de discuter avec vous-meme." };
  }

  const myCircleIds = await prisma.circleMembership.findMany({
    where: { userId: session.user.id },
    select: { circleId: true },
  });

  const isTargetRelated = await prisma.circleMembership.findFirst({
    where: {
      userId: parsed.data.targetUserId,
      circleId: { in: myCircleIds.map((item) => item.circleId) },
    },
  });

  if (!isTargetRelated) {
    return { success: false, message: "Vous ne pouvez contacter que des membres de vos cercles." };
  }

  const existingParticipantEntries = await prisma.directConversationParticipant.findMany({
    where: { userId: session.user.id },
    include: {
      conversation: {
        include: { participants: true },
      },
    },
  });

  const existing = existingParticipantEntries.find((entry) => {
    const participants = entry.conversation.participants;
    return (
      participants.length === 2 &&
      participants.some((participant) => participant.userId === parsed.data.targetUserId) &&
      participants.some((participant) => participant.userId === session.user.id)
    );
  });

  if (existing) {
    return { success: true, conversationId: existing.conversationId };
  }

  const conversation = await prisma.directConversation.create({
    data: {
      participants: {
        createMany: {
          data: [{ userId: session.user.id }, { userId: parsed.data.targetUserId }],
        },
      },
    },
  });

  revalidatePath("/messages");
  return { success: true, conversationId: conversation.id };
}

const sendMessageSchema = z.object({
  conversationId: z.string().min(1),
  content: z.string().trim().min(1).max(1200),
});

export async function sendDirectMessageAction(input: z.infer<typeof sendMessageSchema>) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, message: "Session invalide." };
  }

  const parsed = sendMessageSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, message: "Message invalide." };
  }

  const participant = await prisma.directConversationParticipant.findUnique({
    where: {
      conversationId_userId: {
        conversationId: parsed.data.conversationId,
        userId: session.user.id,
      },
    },
  });

  if (!participant) {
    return { success: false, message: "Acces refuse a cette conversation." };
  }

  await prisma.directMessage.create({
    data: {
      conversationId: parsed.data.conversationId,
      senderId: session.user.id,
      content: parsed.data.content,
    },
  });

  await prisma.directConversation.update({
    where: { id: parsed.data.conversationId },
    data: { updatedAt: new Date() },
  });

  revalidatePath(`/messages/${parsed.data.conversationId}`);
  revalidatePath("/messages");
  return { success: true };
}
