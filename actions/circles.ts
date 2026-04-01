"use server";

import { CircleRole, InvitePermission } from "@prisma/client";
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

  const circle = await prisma.circle.create({
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

  const circle = await prisma.circle.update({
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

  const circle = await prisma.circle.findUnique({ where: { id: parsed.data.circleId }, select: { id: true } });
  if (!circle) {
    return { success: false, message: "Cercle introuvable." };
  }

  await prisma.circle.delete({ where: { id: circle.id } });

  revalidatePath("/cercles");
  revalidatePath("/tableau-de-bord");
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
