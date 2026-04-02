"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { auth } from "@/lib/auth";
import { canManageCircle } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

function revalidateMealPaths(circleId: string, eventId: string) {
  revalidatePath(`/cercles/${circleId}`);
  revalidatePath(`/cercles/${circleId}/evenements/${eventId}`);
  revalidatePath(`/cercles/${circleId}/calendrier`);
  revalidatePath("/tableau-de-bord");
}

async function findEventContext(eventId: string, userId: string) {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: {
      id: true,
      circleId: true,
      hostId: true,
    },
  });

  if (!event) {
    return null;
  }

  const membership = await prisma.circleMembership.findUnique({
    where: {
      circleId_userId: {
        circleId: event.circleId,
        userId,
      },
    },
  });

  if (!membership) {
    return null;
  }

  const canManage = canManageCircle(membership.role) || event.hostId === userId;

  return {
    event,
    membership,
    canManage,
  };
}

const createMealSchema = z.object({
  eventId: z.string().min(1),
  title: z.string().trim().min(2, "Titre requis.").max(120),
  description: z.string().trim().max(400).optional(),
  recipe: z.string().trim().max(4000).optional(),
  servedAtLabel: z.string().trim().max(80).optional(),
  linkedListId: z.string().optional(),
  isPinned: z.boolean().default(false),
});

export async function createEventMealAction(input: z.infer<typeof createMealSchema>) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, message: "Session invalide." };
  }

  const parsed = createMealSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0]?.message ?? "Donnees invalides." };
  }

  const context = await findEventContext(parsed.data.eventId, session.user.id);
  if (!context || !context.canManage) {
    return { success: false, message: "Seul l'organisateur ou un admin peut ajouter un repas." };
  }

  let linkedListId: string | null = null;
  if (parsed.data.linkedListId) {
    const list = await prisma.sharedList.findFirst({
      where: { id: parsed.data.linkedListId, circleId: context.event.circleId },
      select: { id: true },
    });
    if (list) {
      linkedListId = list.id;
    }
  }

  await prisma.eventMeal.create({
    data: {
      eventId: context.event.id,
      createdById: session.user.id,
      linkedListId,
      title: parsed.data.title,
      description: parsed.data.description || null,
      recipe: parsed.data.recipe || null,
      servedAtLabel: parsed.data.servedAtLabel || null,
      isPinned: parsed.data.isPinned,
    },
  });

  revalidateMealPaths(context.event.circleId, context.event.id);
  return { success: true };
}

const updateMealSchema = z.object({
  mealId: z.string().min(1),
  title: z.string().trim().min(2, "Titre requis.").max(120),
  description: z.string().trim().max(400).optional(),
  recipe: z.string().trim().max(4000).optional(),
  servedAtLabel: z.string().trim().max(80).optional(),
  linkedListId: z.string().optional(),
  isPinned: z.boolean(),
});

export async function updateEventMealAction(input: z.infer<typeof updateMealSchema>) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, message: "Session invalide." };
  }

  const parsed = updateMealSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0]?.message ?? "Donnees invalides." };
  }

  const meal = await prisma.eventMeal.findUnique({
    where: { id: parsed.data.mealId },
    include: {
      event: {
        select: {
          id: true,
          circleId: true,
          hostId: true,
        },
      },
    },
  });

  if (!meal) {
    return { success: false, message: "Repas introuvable." };
  }

  const membership = await prisma.circleMembership.findUnique({
    where: {
      circleId_userId: {
        circleId: meal.event.circleId,
        userId: session.user.id,
      },
    },
  });

  if (!membership) {
    return { success: false, message: "Acces refuse." };
  }

  const canManage = canManageCircle(membership.role) || meal.event.hostId === session.user.id || meal.createdById === session.user.id;
  if (!canManage) {
    return { success: false, message: "Seul le createur, organisateur ou un admin peut modifier ce repas." };
  }

  let linkedListId: string | null = null;
  if (parsed.data.linkedListId) {
    const list = await prisma.sharedList.findFirst({
      where: { id: parsed.data.linkedListId, circleId: meal.event.circleId },
      select: { id: true },
    });
    if (list) {
      linkedListId = list.id;
    }
  }

  await prisma.eventMeal.update({
    where: { id: meal.id },
    data: {
      title: parsed.data.title,
      description: parsed.data.description || null,
      recipe: parsed.data.recipe || null,
      servedAtLabel: parsed.data.servedAtLabel || null,
      linkedListId,
      isPinned: parsed.data.isPinned,
    },
  });

  revalidateMealPaths(meal.event.circleId, meal.event.id);
  return { success: true };
}

const deleteMealSchema = z.object({
  mealId: z.string().min(1),
});

export async function deleteEventMealAction(input: z.infer<typeof deleteMealSchema>) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, message: "Session invalide." };
  }

  const parsed = deleteMealSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, message: "Requete invalide." };
  }

  const meal = await prisma.eventMeal.findUnique({
    where: { id: parsed.data.mealId },
    include: {
      event: {
        select: {
          id: true,
          circleId: true,
          hostId: true,
        },
      },
    },
  });

  if (!meal) {
    return { success: false, message: "Repas introuvable." };
  }

  const membership = await prisma.circleMembership.findUnique({
    where: {
      circleId_userId: {
        circleId: meal.event.circleId,
        userId: session.user.id,
      },
    },
  });

  if (!membership) {
    return { success: false, message: "Acces refuse." };
  }

  const canManage = canManageCircle(membership.role) || meal.event.hostId === session.user.id || meal.createdById === session.user.id;
  if (!canManage) {
    return { success: false, message: "Seul le createur, organisateur ou un admin peut supprimer ce repas." };
  }

  await prisma.eventMeal.delete({ where: { id: meal.id } });

  revalidateMealPaths(meal.event.circleId, meal.event.id);
  return { success: true };
}
