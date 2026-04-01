"use client";

import { CircleRole } from "@prisma/client";
import { useState } from "react";

import { createCircleInviteAction } from "@/actions/invites";
import { Button } from "@/components/ui/button";

export function CreateInviteForm({ circleId }: { circleId: string }) {
  const [feedback, setFeedback] = useState<string>("");
  const [isErrorFeedback, setIsErrorFeedback] = useState(false);
  const [inviteUrl, setInviteUrl] = useState<string>("");
  const [isBusy, setIsBusy] = useState(false);

  const copyInviteUrl = async () => {
    if (!inviteUrl) return;

    try {
      await navigator.clipboard.writeText(inviteUrl);
      setIsErrorFeedback(false);
      setFeedback("Lien copie dans le presse-papiers.");
    } catch {
      setIsErrorFeedback(true);
      setFeedback("Impossible de copier automatiquement. Copiez le lien manuellement.");
    }
  };

  const shareInviteUrl = async () => {
    if (!inviteUrl) return;

    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: "Invitation Cercle Familial",
          text: "Rejoins notre cercle familial avec ce lien:",
          url: inviteUrl,
        });
        setIsErrorFeedback(false);
        setFeedback("Lien partage avec succes.");
        return;
      } catch {
        // Ignore cancellation and use copy fallback below.
      }
    }

    await copyInviteUrl();
  };

  return (
    <div className="space-y-2 rounded-3xl border border-indigo-100 bg-white p-4">
      <h3 className="font-serif text-lg font-bold text-zinc-900">Invitation par lien</h3>
      <p className="text-xs text-zinc-500">Genere un lien valide 7 jours, 5 utilisations.</p>
      <Button
        className="w-full"
        disabled={isBusy}
        onClick={async () => {
          setIsBusy(true);
          setFeedback("");
          setIsErrorFeedback(false);
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
            setIsErrorFeedback(true);
            setFeedback(result.message ?? "Impossible de creer l'invitation.");
            setIsBusy(false);
            return;
          }

          const origin = window.location.origin;
          setInviteUrl(`${origin}${result.inviteUrl}`);
          setIsErrorFeedback(false);
          setFeedback("Lien d'invitation genere.");
          setIsBusy(false);
        }}
      >
        {isBusy ? "Generation..." : "Generer un lien d'invitation"}
      </Button>
      {inviteUrl ? <p className="break-all rounded-xl bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">{inviteUrl}</p> : null}
      {inviteUrl ? (
        <div className="grid grid-cols-2 gap-2">
          <Button type="button" variant="secondary" className="w-full" onClick={copyInviteUrl}>
            Copier le lien
          </Button>
          <Button type="button" className="w-full" onClick={shareInviteUrl}>
            Partager
          </Button>
        </div>
      ) : null}
      {feedback ? (
        <p className={`rounded-xl px-3 py-2 text-xs font-semibold ${isErrorFeedback ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-700"}`}>
          {feedback}
        </p>
      ) : null}
    </div>
  );
}
