import { HistoryActionType, HistoryObjectType, Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

type HistoryWriter = Prisma.TransactionClient | typeof prisma;
type CreateHistoryArgs = Parameters<typeof prisma.actionHistory.create>[0];

type LogActionInput = {
  actionType: HistoryActionType;
  objectType: HistoryObjectType;
  objectId: string;
  objectLabel?: string | null;
  actorUserId: string;
  actorDisplayName?: string | null;
  circleId?: string | null;
  eventId?: string | null;
  details?: Prisma.InputJsonValue;
  previousValue?: Prisma.InputJsonValue;
  newValue?: Prisma.InputJsonValue;
};

export async function logActionHistory(input: LogActionInput) {
  await safeCreateHistory(prisma, {
    data: {
      actionType: input.actionType,
      objectType: input.objectType,
      objectId: input.objectId,
      objectLabel: input.objectLabel ?? null,
      actorUserId: input.actorUserId,
      actorDisplayName: input.actorDisplayName ?? null,
      circleId: input.circleId ?? null,
      eventId: input.eventId ?? null,
      details: input.details,
      previousValue: input.previousValue,
      newValue: input.newValue,
    },
  });
}

export async function safeCreateHistory(writer: HistoryWriter, args: CreateHistoryArgs) {
  try {
    await writer.actionHistory.create(args);
  } catch (error) {
    const code =
      typeof error === "object" && error !== null && "code" in error
        ? String((error as { code?: string }).code)
        : "";

    if (code === "P2021" || code === "P2022") {
      console.warn("[history] Table/colonne historique indisponible, journalisation ignoree temporairement.", {
        code,
      });
      return;
    }

    throw error;
  }
}
