"use server";

import { CircleRole, SharedTaskPriority, SharedTaskStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { auth } from "@/lib/auth";
import { canManageCircle } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

function canCreateSharedTask(role: CircleRole) {
  return role === CircleRole.ADMIN || role === CircleRole.ADULTE;
}

async function getMembership(circleId: string, userId: string) {
  return prisma.circleMembership.findUnique({
    where: {
      circleId_userId: {
        circleId,
        userId,
      },
    },
  });
}

function revalidateTaskPaths(circleId: string) {
  revalidatePath(`/cercles/${circleId}`);
  revalidatePath(`/cercles/${circleId}/taches`);
  revalidatePath("/tableau-de-bord");
}

function parseDueAt(value?: string | null) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

const createSharedTaskSchema = z.object({
  circleId: z.string().min(1),
  title: z.string().trim().min(2, "Titre requis."),
  note: z.string().trim().max(300).optional(),
  dueAt: z.string().optional(),
  priority: z.nativeEnum(SharedTaskPriority).default(SharedTaskPriority.NORMALE),
  assigneeUserId: z.string().optional(),
});

export async function createSharedTaskAction(input: z.infer<typeof createSharedTaskSchema>) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, message: "Session invalide." };
  }

  const parsed = createSharedTaskSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0]?.message ?? "Donnees invalides." };
  }

  const membership = await getMembership(parsed.data.circleId, session.user.id);
  if (!membership || !canCreateSharedTask(membership.role)) {
    return { success: false, message: "Action reservee aux adultes et admins." };
  }

  let assigneeUserId: string | null = null;
  if (parsed.data.assigneeUserId) {
    const assigneeMembership = await getMembership(parsed.data.circleId, parsed.data.assigneeUserId);
    if (assigneeMembership) {
      assigneeUserId = parsed.data.assigneeUserId;
    }
  }

  await prisma.sharedTask.create({
    data: {
      circleId: parsed.data.circleId,
      createdById: session.user.id,
      assigneeUserId,
      title: parsed.data.title,
      note: parsed.data.note || null,
      dueAt: parseDueAt(parsed.data.dueAt),
      priority: parsed.data.priority,
    },
  });

  revalidateTaskPaths(parsed.data.circleId);
  return { success: true };
}

const updateSharedTaskSchema = z.object({
  taskId: z.string().min(1),
  title: z.string().trim().min(2, "Titre requis."),
  note: z.string().trim().max(300).optional(),
  dueAt: z.string().optional(),
  priority: z.nativeEnum(SharedTaskPriority),
  status: z.nativeEnum(SharedTaskStatus),
  assigneeUserId: z.string().optional(),
});

export async function updateSharedTaskAction(input: z.infer<typeof updateSharedTaskSchema>) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, message: "Session invalide." };
  }

  const parsed = updateSharedTaskSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0]?.message ?? "Donnees invalides." };
  }

  const task = await prisma.sharedTask.findUnique({
    where: { id: parsed.data.taskId },
    select: { id: true, circleId: true, createdById: true },
  });

  if (!task) {
    return { success: false, message: "Tache introuvable." };
  }

  const membership = await getMembership(task.circleId, session.user.id);
  if (!membership) {
    return { success: false, message: "Acces refuse." };
  }

  const canManage = canManageCircle(membership.role) || task.createdById === session.user.id;
  if (!canManage) {
    return { success: false, message: "Seul le createur ou un admin peut modifier cette tache." };
  }

  let assigneeUserId: string | null = null;
  if (parsed.data.assigneeUserId) {
    const assigneeMembership = await getMembership(task.circleId, parsed.data.assigneeUserId);
    if (assigneeMembership) {
      assigneeUserId = parsed.data.assigneeUserId;
    }
  }

  await prisma.sharedTask.update({
    where: { id: task.id },
    data: {
      title: parsed.data.title,
      note: parsed.data.note || null,
      dueAt: parseDueAt(parsed.data.dueAt),
      priority: parsed.data.priority,
      status: parsed.data.status,
      assigneeUserId,
      completedAt: parsed.data.status === SharedTaskStatus.TERMINE ? new Date() : null,
    },
  });

  revalidateTaskPaths(task.circleId);
  return { success: true };
}

const setSharedTaskStatusSchema = z.object({
  taskId: z.string().min(1),
  status: z.nativeEnum(SharedTaskStatus),
});

export async function setSharedTaskStatusAction(input: z.infer<typeof setSharedTaskStatusSchema>) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, message: "Session invalide." };
  }

  const parsed = setSharedTaskStatusSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, message: "Requete invalide." };
  }

  const task = await prisma.sharedTask.findUnique({
    where: { id: parsed.data.taskId },
    select: { id: true, circleId: true, createdById: true, assigneeUserId: true },
  });

  if (!task) {
    return { success: false, message: "Tache introuvable." };
  }

  const membership = await getMembership(task.circleId, session.user.id);
  if (!membership) {
    return { success: false, message: "Acces refuse." };
  }

  const canUpdateStatus =
    canManageCircle(membership.role) ||
    task.createdById === session.user.id ||
    task.assigneeUserId === session.user.id;

  if (!canUpdateStatus) {
    return { success: false, message: "Seul le responsable, le createur ou un admin peut changer le statut." };
  }

  await prisma.sharedTask.update({
    where: { id: task.id },
    data: {
      status: parsed.data.status,
      completedAt: parsed.data.status === SharedTaskStatus.TERMINE ? new Date() : null,
    },
  });

  revalidateTaskPaths(task.circleId);
  return { success: true };
}

const deleteSharedTaskSchema = z.object({
  taskId: z.string().min(1),
});

export async function deleteSharedTaskAction(input: z.infer<typeof deleteSharedTaskSchema>) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, message: "Session invalide." };
  }

  const parsed = deleteSharedTaskSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, message: "Requete invalide." };
  }

  const task = await prisma.sharedTask.findUnique({
    where: { id: parsed.data.taskId },
    select: { id: true, circleId: true, createdById: true },
  });

  if (!task) {
    return { success: false, message: "Tache introuvable." };
  }

  const membership = await getMembership(task.circleId, session.user.id);
  if (!membership) {
    return { success: false, message: "Acces refuse." };
  }

  const canManage = canManageCircle(membership.role) || task.createdById === session.user.id;
  if (!canManage) {
    return { success: false, message: "Seul le createur ou un admin peut supprimer cette tache." };
  }

  await prisma.sharedTask.delete({ where: { id: task.id } });

  revalidateTaskPaths(task.circleId);
  return { success: true };
}