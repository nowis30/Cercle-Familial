"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { deleteEventAction } from "@/actions/events";
import { ConfirmDestructiveDialog } from "@/components/shared/confirm-destructive-dialog";

export function EventManagementActions({
  circleId,
  eventId,
  eventTitle,
  canManage,
}: {
  circleId: string;
  eventId: string;
  eventTitle: string;
  canManage: boolean;
}) {
  const router = useRouter();
  const [feedback, setFeedback] = useState("");

  if (!canManage) return null;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <Link
          href={`/cercles/${circleId}/evenements/${eventId}/modifier`}
          className="rounded-xl border border-indigo-200 bg-white px-3 py-2 text-xs font-semibold text-indigo-700 hover:bg-indigo-50"
        >
          Modifier
        </Link>
        <Link
          href={`/cercles/${circleId}/evenements/nouveau?duplicateFrom=${eventId}`}
          className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
        >
          Dupliquer
        </Link>
        <ConfirmDestructiveDialog
          confirmValue={eventTitle}
          itemType="événement"
          triggerLabel="Supprimer"
          warningMessage="Les participants, commentaires, photos et contributions liés à cet événement seront supprimés de façon permanente."
          onConfirm={async () => {
            const result = await deleteEventAction({ eventId });
            if (!result.success) {
              setFeedback(result.message ?? "Suppression impossible.");
              return;
            }
            router.push(`/cercles/${circleId}`);
            router.refresh();
          }}
        />
      </div>
      {feedback ? <p className="text-xs font-semibold text-rose-700">{feedback}</p> : null}
    </div>
  );
}
