"use client";

import { Pencil, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";

import {
  createEventBudgetItemAction,
  deleteEventBudgetItemAction,
  updateEventBudgetItemAction,
} from "@/actions/budget";
import { ConfirmDestructiveDialog } from "@/components/shared/confirm-destructive-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type BudgetItemView = {
  id: string;
  label: string;
  plannedAmount: string | null;
  actualAmount: string | null;
  paidByName: string | null;
  note: string | null;
};

type EditState = {
  id: string;
  label: string;
  plannedAmount: string;
  actualAmount: string;
  paidByName: string;
  note: string;
};

function amountToNumber(value: string | null) {
  if (!value) return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseAmountInput(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("fr-CA", { style: "currency", currency: "CAD" }).format(value);
}

export function EventBudgetPanel({
  eventId,
  canManage,
  items,
}: {
  eventId: string;
  canManage: boolean;
  items: BudgetItemView[];
}) {
  const router = useRouter();
  const [feedback, setFeedback] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [label, setLabel] = useState("");
  const [plannedAmount, setPlannedAmount] = useState("");
  const [actualAmount, setActualAmount] = useState("");
  const [paidByName, setPaidByName] = useState("");
  const [note, setNote] = useState("");
  const [editing, setEditing] = useState<EditState | null>(null);

  const totals = useMemo(() => {
    const planned = items.reduce((sum, item) => sum + amountToNumber(item.plannedAmount), 0);
    const actual = items.reduce((sum, item) => sum + amountToNumber(item.actualAmount), 0);
    return { planned, actual, diff: actual - planned };
  }, [items]);

  function setSuccess(text: string) {
    setFeedback({ tone: "success", text });
  }

  function setError(text: string) {
    setFeedback({ tone: "error", text });
  }

  async function refreshAfterAction(successMessage?: string) {
    router.refresh();
    if (successMessage) setSuccess(successMessage);
  }

  async function onCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canManage) {
      setError("Seul l'organisateur ou un admin peut gerer le budget.");
      return;
    }

    setIsSubmitting(true);
    const result = await createEventBudgetItemAction({
      eventId,
      label,
      plannedAmount: parseAmountInput(plannedAmount),
      actualAmount: parseAmountInput(actualAmount),
      paidByName,
      note,
    });
    setIsSubmitting(false);

    if (!result.success) {
      setError(result.message ?? "Creation impossible.");
      return;
    }

    setLabel("");
    setPlannedAmount("");
    setActualAmount("");
    setPaidByName("");
    setNote("");
    await refreshAfterAction("Ligne budget ajoutee.");
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 px-3 py-2 text-sm">
          <p className="text-xs font-semibold text-indigo-700">Prevu</p>
          <p className="font-bold text-zinc-900">{formatMoney(totals.planned)}</p>
        </div>
        <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 px-3 py-2 text-sm">
          <p className="text-xs font-semibold text-emerald-700">Reel</p>
          <p className="font-bold text-zinc-900">{formatMoney(totals.actual)}</p>
        </div>
        <div className="rounded-xl border border-amber-100 bg-amber-50/60 px-3 py-2 text-sm">
          <p className="text-xs font-semibold text-amber-700">Ecart</p>
          <p className="font-bold text-zinc-900">{formatMoney(totals.diff)}</p>
        </div>
      </div>

      {canManage ? (
        <form className="space-y-2 rounded-2xl border border-indigo-100 bg-indigo-50/40 p-3" onSubmit={onCreate}>
          <Input value={label} onChange={(event) => setLabel(event.target.value)} placeholder="Libelle (ex: Salle)" disabled={isSubmitting} />
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <Input value={plannedAmount} onChange={(event) => setPlannedAmount(event.target.value)} placeholder="Depense prevue ($)" inputMode="decimal" disabled={isSubmitting} />
            <Input value={actualAmount} onChange={(event) => setActualAmount(event.target.value)} placeholder="Depense reelle ($)" inputMode="decimal" disabled={isSubmitting} />
          </div>
          <Input value={paidByName} onChange={(event) => setPaidByName(event.target.value)} placeholder="Paye par" disabled={isSubmitting} />
          <Textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="Note" className="min-h-20" disabled={isSubmitting} />
          <Button type="submit" className="h-10 w-full" disabled={isSubmitting}>
            <Plus className="mr-1 h-4 w-4" />
            Ajouter une ligne
          </Button>
        </form>
      ) : null}

      {feedback ? (
        <p className={`rounded-xl px-3 py-2 text-xs font-semibold ${feedback.tone === "success" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
          {feedback.text}
        </p>
      ) : null}

      {items.length === 0 ? <p className="text-sm text-zinc-600">Aucune ligne budget pour le moment.</p> : null}

      {items.map((item) => (
        <div key={item.id} className="rounded-2xl border border-zinc-200 bg-white p-3">
          <p className="text-sm font-semibold text-zinc-900">{item.label}</p>
          <p className="mt-1 text-xs text-zinc-700">Prevu: {formatMoney(amountToNumber(item.plannedAmount))} · Reel: {formatMoney(amountToNumber(item.actualAmount))}</p>
          {item.paidByName ? <p className="mt-1 text-xs text-zinc-700">Paye par: {item.paidByName}</p> : null}
          {item.note ? <p className="mt-1 text-xs text-zinc-600">{item.note}</p> : null}

          {canManage ? (
            <div className="mt-2 flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  setEditing({
                    id: item.id,
                    label: item.label,
                    plannedAmount: item.plannedAmount ?? "",
                    actualAmount: item.actualAmount ?? "",
                    paidByName: item.paidByName ?? "",
                    note: item.note ?? "",
                  })
                }
              >
                <Pencil className="mr-1 h-3.5 w-3.5" />
                Modifier
              </Button>
              <ConfirmDestructiveDialog
                confirmValue={item.label}
                itemType="ligne budget"
                triggerLabel="Supprimer"
                warningMessage="Cette ligne budget sera supprimee definitivement."
                onConfirm={async () => {
                  const result = await deleteEventBudgetItemAction({ itemId: item.id });
                  if (!result.success) {
                    setError(result.message ?? "Suppression impossible.");
                    return;
                  }
                  await refreshAfterAction("Ligne budget supprimee.");
                }}
              />
            </div>
          ) : null}

          {editing?.id === item.id ? (
            <div className="mt-2 space-y-2 rounded-xl border border-indigo-100 bg-indigo-50/40 p-3">
              <Input value={editing.label} onChange={(event) => setEditing((prev) => (prev ? { ...prev, label: event.target.value } : prev))} placeholder="Libelle" />
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <Input value={editing.plannedAmount} onChange={(event) => setEditing((prev) => (prev ? { ...prev, plannedAmount: event.target.value } : prev))} placeholder="Prevu" inputMode="decimal" />
                <Input value={editing.actualAmount} onChange={(event) => setEditing((prev) => (prev ? { ...prev, actualAmount: event.target.value } : prev))} placeholder="Reel" inputMode="decimal" />
              </div>
              <Input value={editing.paidByName} onChange={(event) => setEditing((prev) => (prev ? { ...prev, paidByName: event.target.value } : prev))} placeholder="Paye par" />
              <Textarea value={editing.note} onChange={(event) => setEditing((prev) => (prev ? { ...prev, note: event.target.value } : prev))} placeholder="Note" className="min-h-20" />
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  onClick={async () => {
                    if (!editing) return;
                    const result = await updateEventBudgetItemAction({
                      itemId: editing.id,
                      label: editing.label,
                      plannedAmount: parseAmountInput(editing.plannedAmount),
                      actualAmount: parseAmountInput(editing.actualAmount),
                      paidByName: editing.paidByName,
                      note: editing.note,
                    });
                    if (!result.success) {
                      setError(result.message ?? "Modification impossible.");
                      return;
                    }
                    setEditing(null);
                    await refreshAfterAction("Ligne budget modifiee.");
                  }}
                >
                  Enregistrer
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>
                  Annuler
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}
