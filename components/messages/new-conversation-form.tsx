"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { openOrCreateConversationAction } from "@/actions/messages";
import { Button } from "@/components/ui/button";

type Target = { id: string; name: string };

export function NewConversationForm({ targets }: { targets: Target[] }) {
  const router = useRouter();
  const [targetUserId, setTargetUserId] = useState(targets[0]?.id ?? "");
  const [feedback, setFeedback] = useState("");

  return (
    <div className="space-y-2 rounded-3xl border border-indigo-100 bg-white p-4">
      <p className="font-serif text-lg font-bold text-zinc-900">Nouvelle conversation</p>
      <select
        className="h-10 w-full rounded-xl border border-indigo-100 bg-white px-3 text-sm text-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300"
        value={targetUserId}
        onChange={(event) => setTargetUserId(event.target.value)}
      >
        {targets.map((target) => (
          <option key={target.id} value={target.id}>
            {target.name}
          </option>
        ))}
      </select>
      <Button
        onClick={async () => {
          if (!targetUserId) return;
          const result = await openOrCreateConversationAction({ targetUserId });
          if (!result.success) {
            setFeedback(result.message ?? "Impossible d'ouvrir la conversation.");
            return;
          }
          router.push(`/messages/${result.conversationId}`);
        }}
      >
        Ouvrir
      </Button>
      {feedback ? <p className="text-xs font-medium text-rose-700">{feedback}</p> : null}
    </div>
  );
}
