"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { removeMemberAction } from "@/actions/circles";
import { ConfirmDestructiveDialog } from "@/components/shared/confirm-destructive-dialog";

export function RemoveMemberButton({
  circleId,
  targetUserId,
  memberName,
}: {
  circleId: string;
  targetUserId: string;
  memberName: string;
}) {
  const router = useRouter();
  const [feedback, setFeedback] = useState("");

  return (
    <div>
      <ConfirmDestructiveDialog
        confirmValue={memberName}
        itemType="membre"
        triggerLabel="Retirer"
        triggerVariant="outline"
        warningMessage={`${memberName} sera retiré(e) du cercle et n'aura plus accès aux événements, discussions et données associées.`}
        onConfirm={async () => {
          const result = await removeMemberAction({ circleId, targetUserId });
          if (!result.success) {
            setFeedback(result.message ?? "Impossible de retirer ce membre.");
            return;
          }
          router.refresh();
        }}
      />
      {feedback ? <p className="mt-1 text-xs font-semibold text-rose-700">{feedback}</p> : null}
    </div>
  );
}
