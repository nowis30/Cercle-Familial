"use server";

import { CircleRole } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { auth } from "@/lib/auth";
import { canManageCircle } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

function canCreateSharedNote(role: CircleRole) {
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

function revalidateNotePaths(circleId: string, eventId?: string | null) {
  revalidatePath(`/cercles/${circleId}`);
  revalidatePath(`/cercles/${circleId}/notes`);
  if (eventId) {
    revalidatePath(`/cercles/${circleId}/evenements/${eventId}`);
  }
  revalidatePath("/tableau-de-bord");
}

const createSharedNoteSchema = z.object({
  circleId: z.string().min(1),
  eventId: z.string().optional(),
  title: z.string().trim().min(2, "Titre requis.").max(120),
  content: z.string().trim().min(2, "Contenu requis.").max(5000),
  isPinned: z.boolean().default(false),
});

export async function createSharedNoteAction(input: z.infer<typeof createSharedNoteSchema>) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, message: "Session invalide." };
  }

  const parsed = createSharedNoteSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0]?.message ?? "Donnees invalides." };
  }

  const data = parsed.data;
  const membership = await getMembership(data.circleId, session.user.id);

  if (!membership || !canCreateSharedNote(membership.role)) {
    return { success: false, message: "Action reservee aux adultes et admins." };
  }

  if (data.eventId) {
    const event = await prisma.event.findFirst({
      where: { id: data.eventId, circleId: data.circleId },
      select: { id: true },
    });
    if (!event) {
      return { success: false, message: "Evenement introuvable." };
    }
  }

  await prisma.sharedNote.create({
    data: {
      circleId: data.circleId,
      eventId: data.eventId || null,
      createdById: session.user.id,
      title: data.title,
      content: data.content,
      isPinned: data.isPinned,
    },
  });

  revalidateNotePaths(data.circleId, data.eventId);
  return { success: true };
}

const updateSharedNoteSchema = z.object({
  noteId: z.string().min(1),
  title: z.string().trim().min(2, "Titre requis.").max(120),
  content: z.string().trim().min(2, "Contenu requis.").max(5000),
  isPinned: z.boolean(),
});

export async function updateSharedNoteAction(input: z.infer<typeof updateSharedNoteSchema>) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, message: "Session invalide." };
  }

  const parsed = updateSharedNoteSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0]?.message ?? "Donnees invalides." };
  }

  const note = await prisma.sharedNote.findUnique({
    where: { id: parsed.data.noteId },
    select: { id: true, circleId: true, eventId: true, createdById: true },
  });

  if (!note) {
    return { success: false, message: "Note introuvable." };
  }

  const membership = await getMembership(note.circleId, session.user.id);
  if (!membership) {
    return { success: false, message: "Acces refuse." };
  }

  const canManage = canManageCircle(membership.role) || note.createdById === session.user.id;
  if (!canManage) {
    return { success: false, message: "Seul le createur ou un admin peut modifier cette note." };
  }

  await prisma.sharedNote.update({
    where: { id: note.id },
    data: {
      title: parsed.data.title,
      content: parsed.data.content,
      isPinned: parsed.data.isPinned,
    },
  });

  revalidateNotePaths(note.circleId, note.eventId);
  return { success: true };
}

const setSharedNotePinnedSchema = z.object({
  noteId: z.string().min(1),
  pinned: z.boolean(),
});

export async function setSharedNotePinnedAction(input: z.infer<typeof setSharedNotePinnedSchema>) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, message: "Session invalide." };
  }

  const parsed = setSharedNotePinnedSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, message: "Requete invalide." };
  }

  const note = await prisma.sharedNote.findUnique({
    where: { id: parsed.data.noteId },
    select: { id: true, circleId: true, eventId: true, createdById: true },
  });

  if (!note) {
    return { success: false, message: "Note introuvable." };
  }

  const membership = await getMembership(note.circleId, session.user.id);
  if (!membership) {
    return { success: false, message: "Acces refuse." };
  }

  const canManage = canManageCircle(membership.role) || note.createdById === session.user.id;
  if (!canManage) {
    return { success: false, message: "Seul le createur ou un admin peut epingler cette note." };
  }

  await prisma.sharedNote.update({
    where: { id: note.id },
    data: {
      isPinned: parsed.data.pinned,
    },
  });

  revalidateNotePaths(note.circleId, note.eventId);
  return { success: true };
}

const deleteSharedNoteSchema = z.object({
  noteId: z.string().min(1),
});

export async function deleteSharedNoteAction(input: z.infer<typeof deleteSharedNoteSchema>) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, message: "Session invalide." };
  }

  const parsed = deleteSharedNoteSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, message: "Requete invalide." };
  }

  const note = await prisma.sharedNote.findUnique({
    where: { id: parsed.data.noteId },
    select: { id: true, circleId: true, eventId: true, createdById: true },
  });

  if (!note) {
    return { success: false, message: "Note introuvable." };
  }

  const membership = await getMembership(note.circleId, session.user.id);
  if (!membership) {
    return { success: false, message: "Acces refuse." };
  }

  const canManage = canManageCircle(membership.role) || note.createdById === session.user.id;
  if (!canManage) {
    return { success: false, message: "Seul le createur ou un admin peut supprimer cette note." };
  }

  await prisma.sharedNote.delete({ where: { id: note.id } });

  revalidateNotePaths(note.circleId, note.eventId);
  return { success: true };
}
