"use server";

import crypto from "node:crypto";

import { CircleRole, HistoryActionType, HistoryObjectType } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { safeCreateHistory } from "@/lib/action-history";
import { auth } from "@/lib/auth";
import { canInviteMembers } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

const createInviteSchema = z.object({
  circleId: z.string().min(1),
  expiresAt: z.coerce.date(),
  defaultRole: z.nativeEnum(CircleRole),
  maxUses: z.coerce.number().min(1).max(500),
});

export async function createCircleInviteAction(input: z.infer<typeof createInviteSchema>) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, message: "Session invalide." };
  }

  const parsed = createInviteSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, message: "Invitation invalide." };
  }

  const data = parsed.data;
  const membership = await prisma.circleMembership.findUnique({
    where: {
      circleId_userId: {
        circleId: data.circleId,
        userId: session.user.id,
      },
    },
    include: {
      circle: true,
    },
  });

  if (!membership) {
    return { success: false, message: "Acces refuse." };
  }

  const canInvite = canInviteMembers(membership.role, membership.circle.invitePermission);
  if (!canInvite) {
    return { success: false, message: "Vous ne pouvez pas inviter dans ce cercle." };
  }

  const token = crypto.randomBytes(24).toString("hex");

  const invite = await prisma.circleInvite.create({
    data: {
      circleId: data.circleId,
      createdById: session.user.id,
      expiresAt: data.expiresAt,
      defaultRole: data.defaultRole,
      maxUses: data.maxUses,
      token,
    },
  });

  return { success: true, inviteToken: invite.token, inviteUrl: `/invite/circle/${invite.token}` };
}

const joinSchema = z.object({
  token: z.string().min(8),
});

export async function joinCircleWithTokenAction(input: z.infer<typeof joinSchema>) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, message: "Session invalide." };
  }

  const parsed = joinSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, message: "Lien d'invitation invalide." };
  }

  const data = parsed.data;

  const invite = await prisma.circleInvite.findUnique({ where: { token: data.token } });
  if (!invite) {
    return { success: false, message: "Lien d'invitation invalide.", code: "INVALID_INVITE" };
  }

  if (invite.expiresAt < new Date() || invite.usedCount >= invite.maxUses) {
    return { success: false, message: "Lien d'invitation expire.", code: "EXPIRED_INVITE" };
  }

  const existingMembership = await prisma.circleMembership.findUnique({
    where: {
      circleId_userId: {
        circleId: invite.circleId,
        userId: session.user.id,
      },
    },
  });

  if (!existingMembership) {
    await prisma.$transaction(async (tx) => {
      await tx.circleMembership.create({
        data: {
          circleId: invite.circleId,
          userId: session.user.id,
          role: invite.defaultRole,
        },
      });

      await tx.circleInvite.update({
        where: { id: invite.id },
        data: { usedCount: { increment: 1 } },
      });

      await safeCreateHistory(tx, {
        data: {
          actionType: HistoryActionType.CREATE,
          objectType: HistoryObjectType.MEMBER,
          objectId: session.user.id,
          objectLabel: session.user.name ?? null,
          actorUserId: session.user.id,
          actorDisplayName: session.user.name ?? null,
          circleId: invite.circleId,
          details: {
            source: "INVITE",
            role: invite.defaultRole,
          },
        },
      });
    });
  } else {
    return { success: true, circleId: invite.circleId, alreadyMember: true, code: "ALREADY_MEMBER" };
  }

  revalidatePath("/cercles");
  return { success: true, circleId: invite.circleId, code: "JOINED" };
}
