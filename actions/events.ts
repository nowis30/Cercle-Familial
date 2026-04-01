"use server";

import { unlink } from "node:fs/promises";
import { join } from "node:path";

import { ContributionStatus, EventType, RsvpResponse } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { auth } from "@/lib/auth";
import { canCreateEvent, canManageCircle } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

const createEventSchema = z.object({
  circleId: z.string().min(1),
  title: z.string().min(2),
  type: z.nativeEnum(EventType),
  description: z.string().optional(),
  startsAt: z.coerce.date(),
  endsAt: z.coerce.date().optional(),
  locationName: z.string().min(2),
  address: z.string().optional(),
  invitedUserIds: z.array(z.string()).default([]),
}).superRefine((values, ctx) => {
  if (!values.endsAt) return;

  if (values.endsAt < values.startsAt) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["endsAt"],
      message: "L'heure de fin ne peut pas etre avant l'heure de debut.",
    });
  }
});

export async function createEventAction(input: z.infer<typeof createEventSchema>) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, message: "Session invalide.", code: "INVALID_SESSION" };
  }

  const parsed = createEventSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? "Formulaire invalide.",
      issues: parsed.error.issues,
      code: "INVALID_FORM",
    };
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

  if (!membership || !canCreateEvent(membership.role)) {
    return {
      success: false,
      message: "Seuls les adultes et admins peuvent creer un evenement.",
      code: "PERMISSION_DENIED",
    };
  }

  const invitedUserIds = Array.from(new Set(data.invitedUserIds.filter(Boolean)));
  const validInvitedMemberships = invitedUserIds.length
    ? await prisma.circleMembership.findMany({
        where: {
          circleId: data.circleId,
          userId: { in: invitedUserIds },
        },
        select: { userId: true },
      })
    : [];
  const validInvitedUserIds = validInvitedMemberships.map((membershipItem) => membershipItem.userId);

  try {
    const event = await prisma.event.create({
      data: {
        circleId: data.circleId,
        hostId: session.user.id,
        title: data.title,
        type: data.type,
        description: data.description,
        startsAt: data.startsAt,
        endsAt: data.endsAt,
        locationName: data.locationName,
        address: data.address,
        ...(validInvitedUserIds.length > 0
          ? {
              invites: {
                createMany: {
                  data: validInvitedUserIds.map((userId) => ({ userId })),
                },
              },
            }
          : {}),
      },
    });

    revalidatePath(`/cercles/${data.circleId}`);
    revalidatePath(`/cercles/${data.circleId}/calendrier`);
    return { success: true, eventId: event.id, code: "OK" };
  } catch (error) {
    console.error("[createEventAction] Echec creation evenement", {
      circleId: data.circleId,
      userId: session.user.id,
      type: data.type,
      startsAt: data.startsAt,
      message: error instanceof Error ? error.message : "Erreur inconnue",
    });

    return {
      success: false,
      message: "Impossible d'enregistrer l'evenement en base de donnees.",
      code: "DATABASE_CREATE_FAILED",
    };
  }
}

const updateEventSchema = z
  .object({
    eventId: z.string().min(1),
    circleId: z.string().min(1),
    title: z.string().min(2),
    type: z.nativeEnum(EventType),
    description: z.string().optional(),
    startsAt: z.coerce.date(),
    endsAt: z.coerce.date().optional(),
    locationName: z.string().min(2),
    address: z.string().optional(),
    invitedUserIds: z.array(z.string()).default([]),
  })
  .superRefine((values, ctx) => {
    if (!values.endsAt) return;

    if (values.endsAt < values.startsAt) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["endsAt"],
        message: "L'heure de fin ne peut pas etre avant l'heure de debut.",
      });
    }
  });

export async function updateEventAction(input: z.infer<typeof updateEventSchema>) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, message: "Session invalide." };
  }

  const parsed = updateEventSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  }

  const data = parsed.data;

  const event = await prisma.event.findUnique({
    where: { id: data.eventId },
    include: { invites: true },
  });

  if (!event) {
    return { success: false, message: "Evenement introuvable." };
  }

  const sourceMembership = await prisma.circleMembership.findUnique({
    where: {
      circleId_userId: {
        circleId: event.circleId,
        userId: session.user.id,
      },
    },
  });

  if (!sourceMembership) {
    return { success: false, message: "Acces refuse." };
  }

  const canManageEvent = canManageCircle(sourceMembership.role) || event.hostId === session.user.id;
  if (!canManageEvent) {
    return { success: false, message: "Seul l'organisateur ou un admin peut modifier cet evenement." };
  }

  const targetMembership = await prisma.circleMembership.findUnique({
    where: {
      circleId_userId: {
        circleId: data.circleId,
        userId: session.user.id,
      },
    },
  });

  if (!targetMembership || !canCreateEvent(targetMembership.role)) {
    return { success: false, message: "Vous ne pouvez pas affecter cet evenement a ce cercle." };
  }

  const invitedUserIds = Array.from(new Set(data.invitedUserIds.filter(Boolean)));
  const validInvitedMemberships = invitedUserIds.length
    ? await prisma.circleMembership.findMany({
        where: {
          circleId: data.circleId,
          userId: { in: invitedUserIds },
        },
        select: { userId: true },
      })
    : [];
  const validInvitedUserIds = validInvitedMemberships.map((membershipItem) => membershipItem.userId);

  await prisma.$transaction(async (tx) => {
    await tx.event.update({
      where: { id: event.id },
      data: {
        circleId: data.circleId,
        title: data.title,
        type: data.type,
        description: data.description,
        startsAt: data.startsAt,
        endsAt: data.endsAt,
        locationName: data.locationName,
        address: data.address,
      },
    });

    await tx.eventInvite.deleteMany({ where: { eventId: event.id } });

    if (validInvitedUserIds.length > 0) {
      await tx.eventInvite.createMany({
        data: validInvitedUserIds.map((userId) => ({ eventId: event.id, userId })),
      });
    }
  });

  revalidatePath(`/cercles/${event.circleId}`);
  revalidatePath(`/cercles/${event.circleId}/calendrier`);
  revalidatePath(`/cercles/${event.circleId}/evenements/${event.id}`);
  revalidatePath(`/cercles/${data.circleId}`);
  revalidatePath(`/cercles/${data.circleId}/calendrier`);
  revalidatePath(`/cercles/${data.circleId}/evenements/${event.id}`);

  return { success: true, eventId: event.id, circleId: data.circleId };
}

const deleteEventSchema = z.object({
  eventId: z.string().min(1),
});

export async function deleteEventAction(input: z.infer<typeof deleteEventSchema>) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, message: "Session invalide." };
  }

  const parsed = deleteEventSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, message: "Requete invalide." };
  }

  const event = await prisma.event.findUnique({ where: { id: parsed.data.eventId } });
  if (!event) {
    return { success: false, message: "Evenement introuvable." };
  }

  const membership = await prisma.circleMembership.findUnique({
    where: {
      circleId_userId: {
        circleId: event.circleId,
        userId: session.user.id,
      },
    },
  });

  if (!membership) {
    return { success: false, message: "Acces refuse." };
  }

  const canDeleteEvent = canManageCircle(membership.role) || event.hostId === session.user.id;
  if (!canDeleteEvent) {
    return { success: false, message: "Seul l'organisateur ou un admin peut supprimer cet evenement." };
  }

  await prisma.event.delete({ where: { id: event.id } });

  revalidatePath(`/cercles/${event.circleId}`);
  revalidatePath(`/cercles/${event.circleId}/calendrier`);
  revalidatePath(`/cercles/${event.circleId}/evenements/${event.id}`);

  return { success: true, circleId: event.circleId };
}

const rsvpSchema = z.object({
  eventId: z.string().min(1),
  response: z.nativeEnum(RsvpResponse),
  adultsCount: z.coerce.number().min(0),
  childrenCount: z.coerce.number().min(0),
  guestsDisplayName: z.string().optional(),
  note: z.string().optional(),
});

export async function respondRsvpAction(input: z.infer<typeof rsvpSchema>) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, message: "Session invalide." };
  }

  const parsed = rsvpSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, message: "RSVP invalide." };
  }
  const data = parsed.data;

  const event = await prisma.event.findUnique({ where: { id: data.eventId } });
  if (!event) {
    return { success: false, message: "Evenement introuvable." };
  }

  const membership = await prisma.circleMembership.findUnique({
    where: {
      circleId_userId: {
        circleId: event.circleId,
        userId: session.user.id,
      },
    },
  });

  if (!membership) {
    return { success: false, message: "Acces refuse." };
  }

  const totalCount = data.adultsCount + data.childrenCount;

  await prisma.eventAttendance.upsert({
    where: {
      eventId_userId: {
        eventId: data.eventId,
        userId: session.user.id,
      },
    },
    create: {
      eventId: data.eventId,
      userId: session.user.id,
      response: data.response,
      adultsCount: data.adultsCount,
      childrenCount: data.childrenCount,
      totalCount,
      guestsDisplayName: data.guestsDisplayName,
      note: data.note,
    },
    update: {
      response: data.response,
      adultsCount: data.adultsCount,
      childrenCount: data.childrenCount,
      totalCount,
      guestsDisplayName: data.guestsDisplayName,
      note: data.note,
    },
  });

  revalidatePath(`/cercles/${event.circleId}/evenements/${event.id}`);
  return { success: true };
}

const contributionCreateSchema = z.object({
  eventId: z.string().min(1),
  name: z.string().trim().min(2),
  quantity: z.coerce.number().min(1).max(200),
  note: z.string().optional(),
  status: z.nativeEnum(ContributionStatus).default(ContributionStatus.MANQUANT),
});

export async function createContributionItemAction(input: z.infer<typeof contributionCreateSchema>) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, message: "Session invalide." };
  }

  const parsed = contributionCreateSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, message: "Item invalide." };
  }

  const event = await prisma.event.findUnique({ where: { id: parsed.data.eventId } });
  if (!event) {
    return { success: false, message: "Evenement introuvable." };
  }

  const membership = await prisma.circleMembership.findUnique({
    where: {
      circleId_userId: {
        circleId: event.circleId,
        userId: session.user.id,
      },
    },
  });

  if (!membership || !canCreateEvent(membership.role)) {
    return { success: false, message: "Action reservee aux adultes/admins." };
  }

  await prisma.eventContributionItem.create({
    data: {
      eventId: event.id,
      name: parsed.data.name,
      quantity: parsed.data.quantity,
      note: parsed.data.note,
      status: parsed.data.status,
    },
  });

  revalidatePath(`/cercles/${event.circleId}/evenements/${event.id}`);
  return { success: true };
}

const reserveContributionSchema = z.object({
  contributionItemId: z.string().min(1),
  reservedNote: z.string().optional(),
});

export async function reserveContributionItemAction(input: z.infer<typeof reserveContributionSchema>) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, message: "Session invalide." };
  }

  const parsed = reserveContributionSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, message: "Reservation invalide." };
  }

  const item = await prisma.eventContributionItem.findUnique({
    where: { id: parsed.data.contributionItemId },
    include: { event: true },
  });

  if (!item) {
    return { success: false, message: "Item introuvable." };
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

  await prisma.eventContributionItem.update({
    where: { id: item.id },
    data: {
      reservedById: session.user.id,
      reservedNote: parsed.data.reservedNote,
      status: item.status === ContributionStatus.MANQUANT ? ContributionStatus.CONFIRME : item.status,
    },
  });

  revalidatePath(`/cercles/${item.event.circleId}/evenements/${item.eventId}`);
  return { success: true };
}

const updateContributionStatusSchema = z.object({
  contributionItemId: z.string().min(1),
  status: z.nativeEnum(ContributionStatus),
});

export async function updateContributionStatusAction(input: z.infer<typeof updateContributionStatusSchema>) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, message: "Session invalide." };
  }

  const parsed = updateContributionStatusSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, message: "Statut invalide." };
  }

  const item = await prisma.eventContributionItem.findUnique({
    where: { id: parsed.data.contributionItemId },
    include: { event: true },
  });
  if (!item) {
    return { success: false, message: "Item introuvable." };
  }

  const membership = await prisma.circleMembership.findUnique({
    where: {
      circleId_userId: {
        circleId: item.event.circleId,
        userId: session.user.id,
      },
    },
  });

  if (!membership || !canCreateEvent(membership.role)) {
    return { success: false, message: "Action reservee aux adultes/admins." };
  }

  await prisma.eventContributionItem.update({
    where: { id: item.id },
    data: { status: parsed.data.status },
  });

  revalidatePath(`/cercles/${item.event.circleId}/evenements/${item.eventId}`);
  return { success: true };
}

const eventCommentSchema = z.object({
  eventId: z.string().min(1),
  content: z.string().trim().min(1).max(1200),
});

export async function postEventCommentAction(input: z.infer<typeof eventCommentSchema>) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, message: "Session invalide." };
  }

  const parsed = eventCommentSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, message: "Commentaire invalide." };
  }

  const event = await prisma.event.findUnique({ where: { id: parsed.data.eventId } });
  if (!event) {
    return { success: false, message: "Evenement introuvable." };
  }

  const membership = await prisma.circleMembership.findUnique({
    where: {
      circleId_userId: {
        circleId: event.circleId,
        userId: session.user.id,
      },
    },
  });
  if (!membership) {
    return { success: false, message: "Acces refuse." };
  }

  await prisma.eventComment.create({
    data: {
      eventId: event.id,
      authorId: session.user.id,
      content: parsed.data.content,
    },
  });

  revalidatePath(`/cercles/${event.circleId}/evenements/${event.id}`);
  return { success: true };
}

const deleteEventCommentSchema = z.object({
  commentId: z.string().min(1),
});

export async function deleteEventCommentAction(input: z.infer<typeof deleteEventCommentSchema>) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, message: "Session invalide." };
  }

  const parsed = deleteEventCommentSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, message: "Requete invalide." };
  }

  const comment = await prisma.eventComment.findUnique({
    where: { id: parsed.data.commentId },
    include: { event: true },
  });

  if (!comment) {
    return { success: false, message: "Commentaire introuvable." };
  }

  const membership = await prisma.circleMembership.findUnique({
    where: {
      circleId_userId: {
        circleId: comment.event.circleId,
        userId: session.user.id,
      },
    },
  });

  if (!membership || !canManageCircle(membership.role)) {
    return { success: false, message: "Suppression reservee aux admins." };
  }

  await prisma.eventComment.delete({ where: { id: comment.id } });
  revalidatePath(`/cercles/${comment.event.circleId}/evenements/${comment.event.id}`);
  return { success: true };
}

const eventPhotoSchema = z.object({
  eventId: z.string().min(1),
  url: z
    .string()
    .min(1)
    .refine((value) => value.startsWith("/uploads/events/") || value.startsWith("https://"), "URL photo invalide"),
  caption: z.string().optional(),
});

export async function addEventPhotoAction(input: z.infer<typeof eventPhotoSchema>) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, message: "Session invalide.", code: "INVALID_SESSION" };
  }

  const parsed = eventPhotoSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, message: "Photo invalide.", code: "INVALID_PHOTO_INPUT" };
  }

  const event = await prisma.event.findUnique({ where: { id: parsed.data.eventId } });
  if (!event) {
    return { success: false, message: "Evenement introuvable.", code: "EVENT_NOT_FOUND" };
  }

  const membership = await prisma.circleMembership.findUnique({
    where: {
      circleId_userId: {
        circleId: event.circleId,
        userId: session.user.id,
      },
    },
  });

  if (!membership) {
    return { success: false, message: "Acces refuse.", code: "PERMISSION_DENIED" };
  }

  try {
    await prisma.eventPhoto.create({
      data: {
        eventId: event.id,
        uploadedBy: session.user.id,
        url: parsed.data.url,
        caption: parsed.data.caption,
      },
    });
  } catch (error) {
    console.error("[addEventPhotoAction] Echec enregistrement photo", {
      eventId: event.id,
      userId: session.user.id,
      message: error instanceof Error ? error.message : "Erreur inconnue",
    });
    return {
      success: false,
      message: "Televersement reussi mais echec d'enregistrement en base de donnees.",
      code: "DATABASE_SAVE_FAILED",
    };
  }

  revalidatePath(`/cercles/${event.circleId}/evenements/${event.id}`);
  return { success: true, code: "OK" };
}

const deleteEventPhotoSchema = z.object({
  photoId: z.string().min(1),
});

export async function deleteEventPhotoAction(input: z.infer<typeof deleteEventPhotoSchema>) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, message: "Session invalide." };
  }

  const parsed = deleteEventPhotoSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, message: "Requete invalide." };
  }

  const photo = await prisma.eventPhoto.findUnique({
    where: { id: parsed.data.photoId },
    include: { event: true },
  });
  if (!photo) {
    return { success: false, message: "Photo introuvable." };
  }

  const membership = await prisma.circleMembership.findUnique({
    where: {
      circleId_userId: {
        circleId: photo.event.circleId,
        userId: session.user.id,
      },
    },
  });

  if (!membership || (!canManageCircle(membership.role) && photo.uploadedBy !== session.user.id)) {
    return { success: false, message: "Suppression non autorisee." };
  }

  await prisma.eventPhoto.delete({ where: { id: photo.id } });

  // Nettoyage best-effort du fichier local pour eviter les orphelins.
  if (photo.url.startsWith("/uploads/events/")) {
    const relativePath = photo.url.replace(/^\/+/, "");
    const absolutePath = join(process.cwd(), "public", relativePath.replace(/^public\//, ""));
    await unlink(absolutePath).catch(() => undefined);
  }

  revalidatePath(`/cercles/${photo.event.circleId}/evenements/${photo.event.id}`);
  return { success: true };
}
