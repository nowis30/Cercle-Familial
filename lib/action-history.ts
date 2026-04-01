import { HistoryActionType, HistoryObjectType, Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

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
  await prisma.actionHistory.create({
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
