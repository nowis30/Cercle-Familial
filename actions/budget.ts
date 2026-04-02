"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { auth } from "@/lib/auth";
import { canManageCircle } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

function revalidateBudgetPaths(circleId: string, eventId: string) {
  revalidatePath(`/cercles/${circleId}`);
  revalidatePath(`/cercles/${circleId}/evenements/${eventId}`);
  revalidatePath(`/cercles/${circleId}/calendrier`);
  revalidatePath("/tableau-de-bord");
}

async function resolveEventAccess(eventId: string, userId: string) {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: {
      id: true,
      circleId: true,
      hostId: true,
    },
  });

  if (!event) return null;

  const membership = await prisma.circleMembership.findUnique({
    where: {
      circleId_userId: {
        circleId: event.circleId,
        userId,
      },
    },
  });

  if (!membership) return null;

  const canManage = canManageCircle(membership.role) || event.hostId === userId;

  return { event, canManage };
}

const amountSchema = z.preprocess((value) => {
  if (value === "" || value === null || value === undefined) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : value;
}, z.number().min(0).max(999999).optional());

const createBudgetItemSchema = z.object({
  eventId: z.string().min(1),
  label: z.string().trim().min(2, "Libelle requis.").max(120),
  plannedAmount: amountSchema,
  actualAmount: amountSchema,
  paidByName: z.string().trim().max(120).optional(),
  note: z.string().trim().max(300).optional(),
});

export async function createEventBudgetItemAction(input: z.infer<typeof createBudgetItemSchema>) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, message: "Session invalide." };
  }

  const parsed = createBudgetItemSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0]?.message ?? "Donnees invalides." };
  }

  const access = await resolveEventAccess(parsed.data.eventId, session.user.id);
  if (!access || !access.canManage) {
    return { success: false, message: "Seul l'organisateur ou un admin peut gerer le budget." };
  }

  await prisma.eventBudgetItem.create({
    data: {
      eventId: access.event.id,
      label: parsed.data.label,
      plannedAmount: parsed.data.plannedAmount,
      actualAmount: parsed.data.actualAmount,
      paidByName: parsed.data.paidByName || null,
      note: parsed.data.note || null,
    },
  });

  revalidateBudgetPaths(access.event.circleId, access.event.id);
  return { success: true };
}

const updateBudgetItemSchema = z.object({
  itemId: z.string().min(1),
  label: z.string().trim().min(2, "Libelle requis.").max(120),
  plannedAmount: amountSchema,
  actualAmount: amountSchema,
  paidByName: z.string().trim().max(120).optional(),
  note: z.string().trim().max(300).optional(),
});

export async function updateEventBudgetItemAction(input: z.infer<typeof updateBudgetItemSchema>) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, message: "Session invalide." };
  }

  const parsed = updateBudgetItemSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0]?.message ?? "Donnees invalides." };
  }

  const item = await prisma.eventBudgetItem.findUnique({
    where: { id: parsed.data.itemId },
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

  if (!item) {
    return { success: false, message: "Ligne budget introuvable." };
  }

  const membership = await prisma.circleMembership.findUnique({
    where: {
      circleId_userId: {
        circleId: item.event.circleId,
        userId: session.user.id,
      },
    },
  });

  if (!membership) {
    return { success: false, message: "Acces refuse." };
  }

  const canManage = canManageCircle(membership.role) || item.event.hostId === session.user.id;
  if (!canManage) {
    return { success: false, message: "Seul l'organisateur ou un admin peut gerer le budget." };
  }

  await prisma.eventBudgetItem.update({
    where: { id: item.id },
    data: {
      label: parsed.data.label,
      plannedAmount: parsed.data.plannedAmount,
      actualAmount: parsed.data.actualAmount,
      paidByName: parsed.data.paidByName || null,
      note: parsed.data.note || null,
    },
  });

  revalidateBudgetPaths(item.event.circleId, item.event.id);
  return { success: true };
}

const deleteBudgetItemSchema = z.object({
  itemId: z.string().min(1),
});

export async function deleteEventBudgetItemAction(input: z.infer<typeof deleteBudgetItemSchema>) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, message: "Session invalide." };
  }

  const parsed = deleteBudgetItemSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, message: "Requete invalide." };
  }

  const item = await prisma.eventBudgetItem.findUnique({
    where: { id: parsed.data.itemId },
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

  if (!item) {
    return { success: false, message: "Ligne budget introuvable." };
  }

  const membership = await prisma.circleMembership.findUnique({
    where: {
      circleId_userId: {
        circleId: item.event.circleId,
        userId: session.user.id,
      },
    },
  });

  if (!membership) {
    return { success: false, message: "Acces refuse." };
  }

  const canManage = canManageCircle(membership.role) || item.event.hostId === session.user.id;
  if (!canManage) {
    return { success: false, message: "Seul l'organisateur ou un admin peut gerer le budget." };
  }

  await prisma.eventBudgetItem.delete({ where: { id: item.id } });

  revalidateBudgetPaths(item.event.circleId, item.event.id);
  return { success: true };
}
