"use client";

import { ContributionStatus } from "@prisma/client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";

import {
  createContributionItemAction,
  deleteContributionItemAction,
  reserveContributionItemAction,
  updateContributionItemAction,
  updateContributionStatusAction,
} from "@/actions/events";
import { ContributionList } from "@/components/events/contribution-list";
import { ConfirmDestructiveDialog } from "@/components/shared/confirm-destructive-dialog";
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

type DraftItem = {
  id: string;
  name: string;
  quantity: number;
  note: string;
};

const nameCollator = new Intl.Collator("fr-CA", { sensitivity: "base", usage: "sort" });

function getFirstName(value?: string | null) {
  if (!value) return "";
  return value.trim().split(/\s+/)[0] ?? "";
}

function buildDraftItem(): DraftItem {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: "",
    quantity: 1,
    note: "",
  };
}

export function EventContributionsPanel({
  eventId,
  items,
  canManageItems,
}: {
  eventId: string;
  items: ContributionItem[];
  canManageItems: boolean;
}) {
  const router = useRouter();
  const [draftItems, setDraftItems] = useState<DraftItem[]>([buildDraftItem()]);
  const [feedback, setFeedback] = useState("");
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editQuantity, setEditQuantity] = useState(1);
  const [editNote, setEditNote] = useState("");
  const [editStatus, setEditStatus] = useState<ContributionStatus>(ContributionStatus.MANQUANT);

  const sortedItems = [...items].sort((a, b) => {
    const aFirstName = getFirstName(a.reservedByName);
    const bFirstName = getFirstName(b.reservedByName);

    const aHasCarrier = Boolean(aFirstName);
    const bHasCarrier = Boolean(bFirstName);

    if (aHasCarrier && !bHasCarrier) return -1;
    if (!aHasCarrier && bHasCarrier) return 1;
    if (!aHasCarrier && !bHasCarrier) return nameCollator.compare(a.name, b.name);

    const byCarrier = nameCollator.compare(aFirstName, bFirstName);
    if (byCarrier !== 0) return byCarrier;

    return nameCollator.compare(a.name, b.name);
  });

  function updateDraftItem(id: string, patch: Partial<DraftItem>) {
    setDraftItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }

  function removeDraftItem(id: string) {
    setDraftItems((prev) => prev.filter((item) => item.id !== id));
  }

  return (
    <div className="space-y-3">
      {canManageItems ? (
        <div className="grid grid-cols-1 gap-2 rounded-2xl border border-indigo-100 bg-indigo-50/40 p-3">
          <p className="text-sm font-semibold text-zinc-800">Ajouter des items</p>

          <div className="space-y-2">
            {draftItems.map((draft, index) => (
              <div key={draft.id} className="rounded-xl border border-indigo-100 bg-white p-2">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-xs font-semibold text-zinc-600">Item {index + 1}</p>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => removeDraftItem(draft.id)}
                    className="h-7 px-2 text-rose-600 hover:bg-rose-50"
                  >
                    <Trash2 className="mr-1 h-3.5 w-3.5" />
                    Retirer
                  </Button>
                </div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  <Input
                    placeholder="Nom"
                    value={draft.name}
                    onChange={(event) => updateDraftItem(draft.id, { name: event.target.value })}
                    className="sm:col-span-2"
                  />
                  <Input
                    type="number"
                    min={1}
                    value={draft.quantity}
                    onChange={(event) => updateDraftItem(draft.id, { quantity: Number(event.target.value) || 1 })}
                  />
                </div>
                <Input
                  placeholder="Note"
                  value={draft.note}
                  onChange={(event) => updateDraftItem(draft.id, { note: event.target.value })}
                  className="mt-2"
                />
              </div>
            ))}
          </div>

          <Button
            type="button"
            variant="secondary"
            onClick={() => setDraftItems((prev) => [...prev, buildDraftItem()])}
          >
            <Plus className="mr-1 h-4 w-4" />
            Ajouter une ligne
          </Button>

          <Button
            type="button"
            onClick={async () => {
              const cleanItems = draftItems
                .map((item) => ({
                  name: item.name.trim(),
                  quantity: item.quantity,
                  note: item.note.trim(),
                }))
                .filter((item) => item.name.length > 0 && item.quantity > 0);

              if (cleanItems.length === 0) {
                setFeedback("Ajoute au moins un item valide avant d'enregistrer.");
                return;
              }

              for (const item of cleanItems) {
                const result = await createContributionItemAction({
                  eventId,
                  name: item.name,
                  quantity: item.quantity,
                  note: item.note,
                  status: ContributionStatus.MANQUANT,
                });
                if (!result.success) {
                  setFeedback(result.message ?? "Impossible d'ajouter un des items.");
                  return;
                }
              }

              setDraftItems([]);
              setFeedback(cleanItems.length > 1 ? "Items ajoutes." : "Item ajoute.");
              router.refresh();
            }}
          >
            Enregistrer les items
          </Button>
          {feedback ? <p className="text-xs font-medium text-indigo-700">{feedback}</p> : null}
        </div>
      ) : null}

      <ContributionList
        items={sortedItems.map((item) => ({
          id: item.id,
          name: item.name,
          quantity: item.quantity,
          note: item.note ?? undefined,
          status: item.status,
          carrierName: item.reservedByName ?? undefined,
        }))}
      />

      <div className="space-y-2">
        {sortedItems.map((item) => (
          <div key={item.id} className="flex flex-wrap items-center gap-2 rounded-2xl border border-zinc-200/80 bg-white p-3 text-xs">
            <span className="mr-2 font-semibold text-zinc-800">{item.name}</span>
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
            {canManageItems ? (
              <>
                <select
                  className="h-8 rounded-lg border border-indigo-100 bg-white px-2 text-zinc-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300"
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
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setEditingItemId(item.id);
                    setEditName(item.name);
                    setEditQuantity(item.quantity);
                    setEditNote(item.note ?? "");
                    setEditStatus(item.status);
                  }}
                >
                  Modifier
                </Button>
                <ConfirmDestructiveDialog
                  confirmValue={item.name}
                  itemType="item"
                  triggerLabel="Supprimer"
                  warningMessage="Cet item sera supprime definitivement."
                  onConfirm={async () => {
                    const result = await deleteContributionItemAction({ contributionItemId: item.id });
                    if (!result.success) {
                      setFeedback(result.message ?? "Suppression impossible.");
                      return;
                    }
                    setFeedback("Item supprime.");
                    router.refresh();
                  }}
                />
              </>
            ) : null}
          </div>
        ))}
      </div>

      {editingItemId ? (
        <div className="grid grid-cols-1 gap-2 rounded-2xl border border-zinc-200 bg-white p-3">
          <p className="text-sm font-semibold text-zinc-800">Modifier l&apos;item</p>
          <Input placeholder="Nom" value={editName} onChange={(event) => setEditName(event.target.value)} />
          <Input type="number" min={1} value={editQuantity} onChange={(event) => setEditQuantity(Number(event.target.value) || 1)} />
          <Input placeholder="Note" value={editNote} onChange={(event) => setEditNote(event.target.value)} />
          <select
            className="h-10 rounded-xl border border-indigo-100 bg-white px-3 text-sm text-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300"
            value={editStatus}
            onChange={(event) => setEditStatus(event.target.value as ContributionStatus)}
          >
            {Object.values(ContributionStatus).map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              onClick={async () => {
                const result = await updateContributionItemAction({
                  contributionItemId: editingItemId,
                  name: editName,
                  quantity: editQuantity,
                  note: editNote,
                  status: editStatus,
                });
                if (!result.success) {
                  setFeedback(result.message ?? "Modification impossible.");
                  return;
                }

                setEditingItemId(null);
                setFeedback("Item modifie.");
                router.refresh();
              }}
            >
              Enregistrer
            </Button>
            <Button size="sm" variant="secondary" onClick={() => setEditingItemId(null)}>
              Annuler
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
