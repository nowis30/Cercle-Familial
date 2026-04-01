"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { deleteCircleAction } from "@/actions/circles";
import { ConfirmDestructiveDialog } from "@/components/shared/confirm-destructive-dialog";

export function CircleManagementActions({
  circleId,
  circleName,
  canManage,
}: {
  circleId: string;
  circleName: string;
  canManage: boolean;
}) {
  const router = useRouter();
  const [feedback, setFeedback] = useState("");

  if (!canManage) return null;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <Link
          href={`/cercles/${circleId}/modifier`}
          className="rounded-xl border border-indigo-200 bg-white px-3 py-2 text-xs font-semibold text-indigo-700 hover:bg-indigo-50"
        >
          Modifier le cercle
        </Link>
        <ConfirmDestructiveDialog
          confirmValue={circleName}
          itemType="cercle"
          triggerLabel="Supprimer le cercle"
          warningMessage="Tous les événements, membres, discussions et invitations de ce cercle seront supprimés de façon permanente."
          onConfirm={async () => {
            const result = await deleteCircleAction({ circleId });
            if (!result.success) {
              setFeedback(result.message ?? "Suppression impossible.");
              return;
            }
            router.push("/cercles");
            router.refresh();
          }}
        />
      </div>
      {feedback ? <p className="text-xs font-semibold text-rose-700">{feedback}</p> : null}
    </div>
  );
}
