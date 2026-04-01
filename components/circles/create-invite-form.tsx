"use client";

import { CircleRole } from "@prisma/client";
import { useState } from "react";

import { createCircleInviteAction } from "@/actions/invites";
import { Button } from "@/components/ui/button";

export function CreateInviteForm({ circleId }: { circleId: string }) {
  const [feedback, setFeedback] = useState<string>("");
  const [inviteUrl, setInviteUrl] = useState<string>("");

  return (
    <div className="space-y-2 rounded-3xl border border-indigo-100 bg-white p-4">
      <h3 className="font-serif text-lg font-bold text-zinc-900">Invitation par lien</h3>
      <p className="text-xs text-zinc-500">Genere un lien valide 7 jours, 5 utilisations.</p>
      <Button
        onClick={async () => {
          setFeedback("");
          setInviteUrl("");
          const expiresAt = new Date();
          expiresAt.setDate(expiresAt.getDate() + 7);

          const result = await createCircleInviteAction({
            circleId,
            expiresAt,
            maxUses: 5,
            defaultRole: CircleRole.ADULTE,
          });

          if (!result.success) {
            setFeedback(result.message ?? "Impossible de creer l'invitation.");
            return;
          }

          const origin = window.location.origin;
          setInviteUrl(`${origin}${result.inviteUrl}`);
        }}
      >
        Generer un lien d&apos;invitation
      </Button>
      {inviteUrl ? <p className="break-all rounded-xl bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">{inviteUrl}</p> : null}
      {feedback ? <p className="rounded-xl bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">{feedback}</p> : null}
    </div>
  );
}
