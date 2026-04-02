"use server";

import { CircleRole, SharedListType } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { auth } from "@/lib/auth";
import { canManageCircle } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

function canCreateSharedList(role: CircleRole) {
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

function revalidateListPaths(circleId: string) {
  revalidatePath(`/cercles/${circleId}`);
  revalidatePath(`/cercles/${circleId}/listes`);
}

const createSharedListSchema = z.object({
  circleId: z.string().min(1),
  title: z.string().trim().min(2, "Titre requis."),
  type: z.nativeEnum(SharedListType).default(SharedListType.LISTE_LIBRE),
  note: z.string().trim().max(300).optional(),
});

export async function createSharedListAction(input: z.infer<typeof createSharedListSchema>) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, message: "Session invalide." };
  }

  const parsed = createSharedListSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0]?.message ?? "Donnees invalides." };
  }

  const data = parsed.data;
  const membership = await getMembership(data.circleId, session.user.id);

  if (!membership || !canCreateSharedList(membership.role)) {
    return { success: false, message: "Action reservee aux adultes et admins." };
  }

  await prisma.sharedList.create({
    data: {
      circleId: data.circleId,
      createdById: session.user.id,
      title: data.title,
      type: data.type,
      note: data.note || null,
    },
  });

  revalidateListPaths(data.circleId);
  return { success: true };
}

const updateSharedListSchema = z.object({
  listId: z.string().min(1),
  title: z.string().trim().min(2, "Titre requis."),
  type: z.nativeEnum(SharedListType),
  note: z.string().trim().max(300).optional(),
});

export async function updateSharedListAction(input: z.infer<typeof updateSharedListSchema>) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, message: "Session invalide." };
  }

  const parsed = updateSharedListSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0]?.message ?? "Donnees invalides." };
  }

  const list = await prisma.sharedList.findUnique({
    where: { id: parsed.data.listId },
    select: { id: true, circleId: true, createdById: true },
  });

  if (!list) {
    return { success: false, message: "Liste introuvable." };
  }

  const membership = await getMembership(list.circleId, session.user.id);
  if (!membership) {
    return { success: false, message: "Acces refuse." };
  }

  const canManage = canManageCircle(membership.role) || list.createdById === session.user.id;
  if (!canManage) {
    return { success: false, message: "Seul le createur ou un admin peut modifier cette liste." };
  }

  await prisma.sharedList.update({
    where: { id: list.id },
    data: {
      title: parsed.data.title,
      type: parsed.data.type,
      note: parsed.data.note || null,
    },
  });

  revalidateListPaths(list.circleId);
  return { success: true };
}

const archiveSharedListSchema = z.object({
  listId: z.string().min(1),
  archived: z.boolean().default(true),
});

export async function setSharedListArchivedAction(input: z.infer<typeof archiveSharedListSchema>) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, message: "Session invalide." };
  }

  const parsed = archiveSharedListSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, message: "Requete invalide." };
  }

  const list = await prisma.sharedList.findUnique({
    where: { id: parsed.data.listId },
    select: { id: true, circleId: true, createdById: true },
  });

  if (!list) {
    return { success: false, message: "Liste introuvable." };
  }

  const membership = await getMembership(list.circleId, session.user.id);
  if (!membership) {
    return { success: false, message: "Acces refuse." };
  }

  const canManage = canManageCircle(membership.role) || list.createdById === session.user.id;
  if (!canManage) {
    return { success: false, message: "Seul le createur ou un admin peut archiver cette liste." };
  }

  await prisma.sharedList.update({
    where: { id: list.id },
    data: {
      isArchived: parsed.data.archived,
    },
  });

  revalidateListPaths(list.circleId);
  return { success: true };
}

const deleteSharedListSchema = z.object({
  listId: z.string().min(1),
});

export async function deleteSharedListAction(input: z.infer<typeof deleteSharedListSchema>) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, message: "Session invalide." };
  }

  const parsed = deleteSharedListSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, message: "Requete invalide." };
  }

  const list = await prisma.sharedList.findUnique({
    where: { id: parsed.data.listId },
    select: { id: true, circleId: true, createdById: true },
  });

  if (!list) {
    return { success: false, message: "Liste introuvable." };
  }

  const membership = await getMembership(list.circleId, session.user.id);
  if (!membership) {
    return { success: false, message: "Acces refuse." };
  }

  const canManage = canManageCircle(membership.role) || list.createdById === session.user.id;
  if (!canManage) {
    return { success: false, message: "Seul le createur ou un admin peut supprimer cette liste." };
  }

  await prisma.sharedList.delete({ where: { id: list.id } });

  revalidateListPaths(list.circleId);
  return { success: true };
}

const createSharedListItemSchema = z.object({
  listId: z.string().min(1),
  label: z.string().trim().min(1, "Libelle requis."),
  comment: z.string().trim().max(300).optional(),
  assigneeUserId: z.string().min(1).optional(),
});

export async function createSharedListItemAction(input: z.infer<typeof createSharedListItemSchema>) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, message: "Session invalide." };
  }

  const parsed = createSharedListItemSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0]?.message ?? "Donnees invalides." };
  }

  const list = await prisma.sharedList.findUnique({
    where: { id: parsed.data.listId },
    select: { id: true, circleId: true, isArchived: true },
  });

  if (!list || list.isArchived) {
    return { success: false, message: "Liste introuvable ou archivee." };
  }

  const membership = await getMembership(list.circleId, session.user.id);
  if (!membership) {
    return { success: false, message: "Acces refuse." };
  }

  let assigneeUserId: string | null = null;
  if (parsed.data.assigneeUserId) {
    const assigneeMembership = await getMembership(list.circleId, parsed.data.assigneeUserId);
    if (assigneeMembership) {
      assigneeUserId = parsed.data.assigneeUserId;
    }
  }

  const position = await prisma.sharedListItem.count({ where: { listId: list.id } });

  await prisma.sharedListItem.create({
    data: {
      listId: list.id,
      createdById: session.user.id,
      label: parsed.data.label,
      comment: parsed.data.comment || null,
      assigneeUserId,
      position,
    },
  });

  revalidateListPaths(list.circleId);
  return { success: true };
}

const updateSharedListItemSchema = z.object({
  itemId: z.string().min(1),
  label: z.string().trim().min(1, "Libelle requis."),
  comment: z.string().trim().max(300).optional(),
  assigneeUserId: z.string().optional(),
});

export async function updateSharedListItemAction(input: z.infer<typeof updateSharedListItemSchema>) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, message: "Session invalide." };
  }

  const parsed = updateSharedListItemSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0]?.message ?? "Donnees invalides." };
  }

  const item = await prisma.sharedListItem.findUnique({
    where: { id: parsed.data.itemId },
    include: {
      list: {
        select: {
          id: true,
          circleId: true,
          createdById: true,
          isArchived: true,
        },
      },
    },
  });

  if (!item || item.list.isArchived) {
    return { success: false, message: "Item introuvable ou liste archivee." };
  }

  const membership = await getMembership(item.list.circleId, session.user.id);
  if (!membership) {
    return { success: false, message: "Acces refuse." };
  }

  const canManage =
    canManageCircle(membership.role) ||
    item.list.createdById === session.user.id ||
    item.createdById === session.user.id;

  if (!canManage) {
    return { success: false, message: "Seul le createur, proprietaire de liste ou admin peut modifier cet item." };
  }

  let assigneeUserId: string | null = null;
  if (parsed.data.assigneeUserId) {
    const assigneeMembership = await getMembership(item.list.circleId, parsed.data.assigneeUserId);
    if (assigneeMembership) {
      assigneeUserId = parsed.data.assigneeUserId;
    }
  }

  await prisma.sharedListItem.update({
    where: { id: item.id },
    data: {
      label: parsed.data.label,
      comment: parsed.data.comment || null,
      assigneeUserId,
    },
  });

  revalidateListPaths(item.list.circleId);
  return { success: true };
}

const toggleSharedListItemSchema = z.object({
  itemId: z.string().min(1),
  checked: z.boolean(),
});

export async function toggleSharedListItemCheckedAction(input: z.infer<typeof toggleSharedListItemSchema>) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, message: "Session invalide." };
  }

  const parsed = toggleSharedListItemSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, message: "Requete invalide." };
  }

  const item = await prisma.sharedListItem.findUnique({
    where: { id: parsed.data.itemId },
    include: {
      list: {
        select: {
          circleId: true,
          isArchived: true,
        },
      },
    },
  });

  if (!item || item.list.isArchived) {
    return { success: false, message: "Item introuvable ou liste archivee." };
  }

  const membership = await getMembership(item.list.circleId, session.user.id);
  if (!membership) {
    return { success: false, message: "Acces refuse." };
  }

  await prisma.sharedListItem.update({
    where: { id: item.id },
    data: {
      isChecked: parsed.data.checked,
      checkedAt: parsed.data.checked ? new Date() : null,
      checkedById: parsed.data.checked ? session.user.id : null,
    },
  });

  revalidateListPaths(item.list.circleId);
  return { success: true };
}

const deleteSharedListItemSchema = z.object({
  itemId: z.string().min(1),
});

export async function deleteSharedListItemAction(input: z.infer<typeof deleteSharedListItemSchema>) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, message: "Session invalide." };
  }

  const parsed = deleteSharedListItemSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, message: "Requete invalide." };
  }

  const item = await prisma.sharedListItem.findUnique({
    where: { id: parsed.data.itemId },
    include: {
      list: {
        select: {
          id: true,
          circleId: true,
          createdById: true,
          isArchived: true,
        },
      },
    },
  });

  if (!item || item.list.isArchived) {
    return { success: false, message: "Item introuvable ou liste archivee." };
  }

  const membership = await getMembership(item.list.circleId, session.user.id);
  if (!membership) {
    return { success: false, message: "Acces refuse." };
  }

  const canManage =
    canManageCircle(membership.role) ||
    item.list.createdById === session.user.id ||
    item.createdById === session.user.id;

  if (!canManage) {
    return { success: false, message: "Seul le createur, proprietaire de liste ou admin peut supprimer cet item." };
  }

  await prisma.sharedListItem.delete({ where: { id: item.id } });

  revalidateListPaths(item.list.circleId);
  return { success: true };
}
