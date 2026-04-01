"use server";

import { CircleRole, HistoryActionType, HistoryObjectType, InvitePermission } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { auth } from "@/lib/auth";
import { canManageCircle } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

const createCircleSchema = z.object({
  name: z.string().trim().min(2, "Nom requis"),
  photoUrl: z.string().url().optional().or(z.literal("")),
  description: z.string().trim().optional(),
  rules: z.string().trim().optional(),
  invitePermission: z.nativeEnum(InvitePermission),
});

export async function createCircleAction(input: z.infer<typeof createCircleSchema>) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, message: "Session invalide." };
  }

  const parsed = createCircleSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, message: "Donnees invalides.", issues: parsed.error.issues };
  }

  const data = parsed.data;
  const baseSlug = data.name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);

  let slug = baseSlug || `cercle-${Date.now()}`;
  let suffix = 1;
  while (await prisma.circle.findUnique({ where: { slug } })) {
    slug = `${baseSlug}-${suffix++}`;
  }

  const circle = await prisma.$transaction(async (tx) => {
    const createdCircle = await tx.circle.create({
      data: {
        name: data.name,
        slug,
        photoUrl: data.photoUrl || null,
        description: data.description || null,
        rules: data.rules || null,
        invitePermission: data.invitePermission,
        memberships: {
          create: {
            userId: session.user.id,
            role: CircleRole.ADMIN,
          },
        },
      },
    });

    await tx.actionHistory.create({
      data: {
        actionType: HistoryActionType.CREATE,
        objectType: HistoryObjectType.CIRCLE,
        objectId: createdCircle.id,
        objectLabel: createdCircle.name,
        actorUserId: session.user.id,
        actorDisplayName: session.user.name ?? null,
        circleId: createdCircle.id,
        newValue: {
          name: createdCircle.name,
          slug: createdCircle.slug,
          invitePermission: createdCircle.invitePermission,
        },
      },
    });

    return createdCircle;
  });

  revalidatePath("/cercles");
  return { success: true, circleId: circle.id };
}

const updateCircleSchema = z.object({
  circleId: z.string().min(1),
  name: z.string().trim().min(2, "Nom requis"),
  photoUrl: z.string().url().optional().or(z.literal("")),
  description: z.string().trim().optional(),
  rules: z.string().trim().optional(),
  invitePermission: z.nativeEnum(InvitePermission),
});

export async function updateCircleAction(input: z.infer<typeof updateCircleSchema>) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, message: "Session invalide." };
  }

  const parsed = updateCircleSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0]?.message ?? "Donnees invalides." };
  }

  const data = parsed.data;

  const membership = await prisma.circleMembership.findUnique({
    where: {
      circleId_userId: {
        circleId: data.circleId,
        userId: session.user.id,
      },
    },
  });

  if (!membership || !canManageCircle(membership.role)) {
    return { success: false, message: "Action reservee aux admins du cercle." };
  }

  const existingCircle = await prisma.circle.findUnique({ where: { id: data.circleId } });
  if (!existingCircle) {
    return { success: false, message: "Cercle introuvable." };
  }

  const normalizedName = data.name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);

  let slug = normalizedName || existingCircle.slug;
  let suffix = 1;
  while (await prisma.circle.findFirst({ where: { slug, NOT: { id: data.circleId } }, select: { id: true } })) {
    slug = `${normalizedName}-${suffix++}`;
  }

  const circle = await prisma.$transaction(async (tx) => {
    const updatedCircle = await tx.circle.update({
      where: { id: data.circleId },
      data: {
        name: data.name,
        slug,
        photoUrl: data.photoUrl || null,
        description: data.description || null,
        rules: data.rules || null,
        invitePermission: data.invitePermission,
      },
    });

    await tx.actionHistory.create({
      data: {
        actionType: HistoryActionType.UPDATE,
        objectType: HistoryObjectType.CIRCLE,
        objectId: updatedCircle.id,
        objectLabel: updatedCircle.name,
        actorUserId: session.user.id,
        actorDisplayName: session.user.name ?? null,
        circleId: updatedCircle.id,
        previousValue: {
          name: existingCircle.name,
          slug: existingCircle.slug,
          photoUrl: existingCircle.photoUrl,
          description: existingCircle.description,
          rules: existingCircle.rules,
          invitePermission: existingCircle.invitePermission,
        },
        newValue: {
          name: updatedCircle.name,
          slug: updatedCircle.slug,
          photoUrl: updatedCircle.photoUrl,
          description: updatedCircle.description,
          rules: updatedCircle.rules,
          invitePermission: updatedCircle.invitePermission,
        },
      },
    });

    return updatedCircle;
  });

  revalidatePath("/cercles");
  revalidatePath(`/cercles/${circle.id}`);
  return { success: true, circleId: circle.id };
}

const deleteCircleSchema = z.object({
  circleId: z.string().min(1),
});

export async function deleteCircleAction(input: z.infer<typeof deleteCircleSchema>) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, message: "Session invalide." };
  }

  const parsed = deleteCircleSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, message: "Requete invalide." };
  }

  const membership = await prisma.circleMembership.findUnique({
    where: {
      circleId_userId: {
        circleId: parsed.data.circleId,
        userId: session.user.id,
      },
    },
  });

  if (!membership || !canManageCircle(membership.role)) {
    return { success: false, message: "Action reservee aux admins du cercle." };
  }

  const circle = await prisma.circle.findUnique({ where: { id: parsed.data.circleId }, select: { id: true, name: true, slug: true } });
  if (!circle) {
    return { success: false, message: "Cercle introuvable." };
  }

  await prisma.$transaction(async (tx) => {
    await tx.circle.delete({ where: { id: circle.id } });

    await tx.actionHistory.create({
      data: {
        actionType: HistoryActionType.DELETE,
        objectType: HistoryObjectType.CIRCLE,
        objectId: circle.id,
        objectLabel: circle.name,
        actorUserId: session.user.id,
        actorDisplayName: session.user.name ?? null,
        circleId: circle.id,
        previousValue: {
          name: circle.name,
          slug: circle.slug,
        },
      },
    });
  });

  revalidatePath("/cercles");
  revalidatePath("/tableau-de-bord");
  return { success: true };
}

const removeMemberSchema = z.object({
  circleId: z.string().min(1),
  targetUserId: z.string().min(1),
});

export async function removeMemberAction(input: z.infer<typeof removeMemberSchema>) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, message: "Session invalide." };
  }

  const parsed = removeMemberSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, message: "Requête invalide." };
  }

  const { circleId, targetUserId } = parsed.data;

  // Vérifier que l'appelant est admin du cercle
  const callerMembership = await prisma.circleMembership.findUnique({
    where: { circleId_userId: { circleId, userId: session.user.id } },
  });
  if (!callerMembership || !canManageCircle(callerMembership.role)) {
    return { success: false, message: "Action réservée aux admins du cercle." };
  }

  // Empêcher l'auto-exclusion via cette action (l'admin quitte via une autre route)
  if (targetUserId === session.user.id) {
    return { success: false, message: "Tu ne peux pas te retirer toi-même via cette action." };
  }

  // Vérifier que la cible est membre du cercle
  const targetMembership = await prisma.circleMembership.findUnique({
    where: { circleId_userId: { circleId, userId: targetUserId } },
    include: {
      user: {
        select: { id: true, name: true },
      },
    },
  });
  if (!targetMembership) {
    return { success: false, message: "Cette personne n'est pas membre du cercle." };
  }

  // Empêcher de retirer le dernier admin
  if (targetMembership.role === CircleRole.ADMIN) {
    const adminCount = await prisma.circleMembership.count({
      where: { circleId, role: CircleRole.ADMIN },
    });
    if (adminCount <= 1) {
      return { success: false, message: "Impossible de retirer le seul administrateur du cercle." };
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.circleMembership.delete({
      where: { circleId_userId: { circleId, userId: targetUserId } },
    });

    await tx.actionHistory.create({
      data: {
        actionType: HistoryActionType.DELETE,
        objectType: HistoryObjectType.MEMBER,
        objectId: targetMembership.user.id,
        objectLabel: targetMembership.user.name,
        actorUserId: session.user.id,
        actorDisplayName: session.user.name ?? null,
        circleId,
        details: {
          removedRole: targetMembership.role,
        },
      },
    });
  });

  revalidatePath(`/cercles/${circleId}/membres`);
  return { success: true };
}

const postCircleMessageSchema = z.object({
  circleId: z.string().min(1),
  content: z.string().trim().min(1).max(1000),
});

export async function postCircleMessageAction(input: z.infer<typeof postCircleMessageSchema>) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, message: "Session invalide." };
  }

  const parsed = postCircleMessageSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, message: "Message invalide." };
  }

  const membership = await prisma.circleMembership.findUnique({
    where: {
      circleId_userId: {
        circleId: parsed.data.circleId,
        userId: session.user.id,
      },
    },
  });

  if (!membership) {
    return { success: false, message: "Acces refuse." };
  }

  await prisma.circleMessage.create({
    data: {
      circleId: parsed.data.circleId,
      authorId: session.user.id,
      content: parsed.data.content,
    },
  });

  revalidatePath(`/cercles/${parsed.data.circleId}/discussion`);
  revalidatePath(`/cercles/${parsed.data.circleId}`);
  return { success: true };
}

const deleteCircleMessageSchema = z.object({
  messageId: z.string().min(1),
});

export async function deleteCircleMessageAction(input: z.infer<typeof deleteCircleMessageSchema>) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, message: "Session invalide." };
  }

  const parsed = deleteCircleMessageSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, message: "Requete invalide." };
  }

  const message = await prisma.circleMessage.findUnique({
    where: { id: parsed.data.messageId },
    include: {
      circle: true,
    },
  });

  if (!message) {
    return { success: false, message: "Message introuvable." };
  }

  const membership = await prisma.circleMembership.findUnique({
    where: {
      circleId_userId: {
        circleId: message.circleId,
        userId: session.user.id,
      },
    },
  });

  if (!membership || !canManageCircle(membership.role)) {
    return { success: false, message: "Action reservee aux admins." };
  }

  await prisma.circleMessage.delete({ where: { id: message.id } });
  revalidatePath(`/cercles/${message.circleId}/discussion`);
  return { success: true };
}
