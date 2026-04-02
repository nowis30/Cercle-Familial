"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { openOrCreateConversationAction } from "@/actions/messages";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Target = { id: string; name: string };

export function NewConversationForm({ targets }: { targets: Target[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [targetUserId, setTargetUserId] = useState(targets[0]?.id ?? "");
  const [feedback, setFeedback] = useState("");

  const filteredTargets = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) {
      return targets;
    }

    return targets.filter((target) => target.name.toLowerCase().includes(normalizedQuery));
  }, [targets, query]);

  const effectiveTargetUserId = filteredTargets.some((target) => target.id === targetUserId)
    ? targetUserId
    : filteredTargets[0]?.id ?? "";

  return (
    <div className="space-y-2 rounded-3xl border border-indigo-100 bg-white p-4">
      <p className="font-serif text-lg font-bold text-zinc-900">Nouvelle conversation</p>
      <Input
        placeholder="Rechercher un membre"
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          setFeedback("");
        }}
      />
      <select
        className="h-10 w-full rounded-xl border border-indigo-100 bg-white px-3 text-sm text-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300"
        value={effectiveTargetUserId}
        onChange={(event) => setTargetUserId(event.target.value)}
      >
        {filteredTargets.map((target) => (
          <option key={target.id} value={target.id}>
            {target.name}
          </option>
        ))}
      </select>
      <Button
        onClick={async () => {
          if (!effectiveTargetUserId) return;
          const result = await openOrCreateConversationAction({ targetUserId: effectiveTargetUserId });
          if (!result.success) {
            setFeedback(result.message ?? "Impossible d'ouvrir la conversation.");
            return;
          }
          router.push(`/messages/${result.conversationId}`);
        }}
      >
        Ouvrir
      </Button>
      {filteredTargets.length === 0 ? <p className="text-xs font-medium text-zinc-600">Aucun membre ne correspond a cette recherche.</p> : null}
      {feedback ? <p className="text-xs font-medium text-rose-700">{feedback}</p> : null}
    </div>
  );
}
