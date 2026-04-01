"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { deleteCircleAction } from "@/actions/circles";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";

export function CircleManagementActions({
  circleId,
  canManage,
}: {
  circleId: string;
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
        <ConfirmDialog
          title="Supprimer le cercle"
          description="Supprimer ce cercle peut affecter les evenements et les membres associes. Veux-tu continuer ?"
          triggerLabel="Supprimer le cercle"
          confirmLabel="Oui, supprimer"
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
