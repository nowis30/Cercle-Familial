"use client";

import { ContributionStatus } from "@prisma/client";
import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  createContributionItemAction,
  reserveContributionItemAction,
  updateContributionStatusAction,
} from "@/actions/events";
import { ContributionList } from "@/components/events/contribution-list";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type ContributionItem = {
  id: string;
  name: string;
  quantity: number;
  note: string | null;
  status: ContributionStatus;
  reservedByName?: string | null;
};

export function EventContributionsPanel({ eventId, items }: { eventId: string; items: ContributionItem[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [note, setNote] = useState("");
  const [feedback, setFeedback] = useState("");

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-2 rounded-2xl border border-zinc-200 bg-white p-3">
        <p className="text-sm font-semibold">Ajouter un item</p>
        <Input placeholder="Nom" value={name} onChange={(event) => setName(event.target.value)} />
        <Input type="number" min={1} value={quantity} onChange={(event) => setQuantity(Number(event.target.value) || 1)} />
        <Input placeholder="Note" value={note} onChange={(event) => setNote(event.target.value)} />
        <Button
          onClick={async () => {
            const result = await createContributionItemAction({ eventId, name, quantity, note, status: ContributionStatus.MANQUANT });
            if (!result.success) {
              setFeedback(result.message ?? "Impossible d'ajouter l'item.");
              return;
            }
            setName("");
            setQuantity(1);
            setNote("");
            setFeedback("Item ajoute.");
            router.refresh();
          }}
        >
          Ajouter
        </Button>
        {feedback ? <p className="text-xs text-zinc-600">{feedback}</p> : null}
      </div>

      <ContributionList
        items={items.map((item) => ({
          id: item.id,
          name: item.name,
          quantity: item.quantity,
          note: item.note ?? item.reservedByName ?? undefined,
          status: item.status,
        }))}
      />

      <div className="space-y-2">
        {items.map((item) => (
          <div key={item.id} className="flex flex-wrap gap-2 rounded-xl bg-white p-3 text-xs">
            <span className="mr-2 font-medium">{item.name}</span>
            <Button
              size="sm"
              variant="secondary"
              onClick={async () => {
                await reserveContributionItemAction({ contributionItemId: item.id, reservedNote: "Reserve" });
                router.refresh();
              }}
            >
              Je reserve
            </Button>
            <select
              className="h-8 rounded-lg border border-zinc-300 px-2"
              value={item.status}
              onChange={async (event) => {
                await updateContributionStatusAction({
                  contributionItemId: item.id,
                  status: event.target.value as ContributionStatus,
                });
                router.refresh();
              }}
            >
              {Object.values(ContributionStatus).map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>
    </div>
  );
}
