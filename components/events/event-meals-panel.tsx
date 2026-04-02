"use client";

import Link from "next/link";
import { Pencil, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import { createEventMealAction, deleteEventMealAction, updateEventMealAction } from "@/actions/meals";
import { ConfirmDestructiveDialog } from "@/components/shared/confirm-destructive-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type MealView = {
  id: string;
  title: string;
  description: string | null;
  recipe: string | null;
  servedAtLabel: string | null;
  isPinned: boolean;
  linkedListId: string | null;
  linkedListTitle: string | null;
  createdByName: string;
};

type ListOption = {
  id: string;
  title: string;
};

type EditState = {
  id: string;
  title: string;
  description: string;
  recipe: string;
  servedAtLabel: string;
  linkedListId: string;
  isPinned: boolean;
};

export function EventMealsPanel({
  circleId,
  eventId,
  canManage,
  meals,
  listOptions,
}: {
  circleId: string;
  eventId: string;
  canManage: boolean;
  meals: MealView[];
  listOptions: ListOption[];
}) {
  const router = useRouter();
  const [feedback, setFeedback] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [recipe, setRecipe] = useState("");
  const [servedAtLabel, setServedAtLabel] = useState("");
  const [linkedListId, setLinkedListId] = useState("");
  const [isPinned, setIsPinned] = useState(false);
  const [editing, setEditing] = useState<EditState | null>(null);

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
      setError("Seul l'organisateur ou un admin peut gerer les repas.");
      return;
    }

    setIsSubmitting(true);
    const result = await createEventMealAction({
      eventId,
      title,
      description,
      recipe,
      servedAtLabel,
      linkedListId: linkedListId || undefined,
      isPinned,
    });
    setIsSubmitting(false);

    if (!result.success) {
      setError(result.message ?? "Creation impossible.");
      return;
    }

    setTitle("");
    setDescription("");
    setRecipe("");
    setServedAtLabel("");
    setLinkedListId("");
    setIsPinned(false);
    await refreshAfterAction("Repas ajoute.");
  }

  return (
    <div className="space-y-3">
      {canManage ? (
        <form className="space-y-2 rounded-2xl border border-amber-100 bg-amber-50/50 p-3" onSubmit={onCreate}>
          <Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Nom du repas (ex: Brunch de Paques)" disabled={isSubmitting} />
          <Input value={servedAtLabel} onChange={(event) => setServedAtLabel(event.target.value)} placeholder="Moment (ex: Dimanche midi)" disabled={isSubmitting} />
          <Textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Description rapide" className="min-h-20" disabled={isSubmitting} />
          <Textarea value={recipe} onChange={(event) => setRecipe(event.target.value)} placeholder="Fiche recette ou consigne" className="min-h-24" disabled={isSubmitting} />
          <select
            value={linkedListId}
            onChange={(event) => setLinkedListId(event.target.value)}
            className="h-10 w-full rounded-xl border border-amber-100 bg-white px-3 text-sm text-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
            disabled={isSubmitting}
          >
            <option value="">Aucune liste liee</option>
            {listOptions.map((list) => (
              <option key={list.id} value={list.id}>
                {list.title}
              </option>
            ))}
          </select>
          <label className="inline-flex items-center gap-2 text-sm text-zinc-700">
            <input type="checkbox" checked={isPinned} onChange={(event) => setIsPinned(event.target.checked)} disabled={isSubmitting} />
            Epingler ce repas
          </label>
          <Button type="submit" className="h-10 w-full" disabled={isSubmitting}>
            <Plus className="mr-1 h-4 w-4" />
            Ajouter un repas
          </Button>
        </form>
      ) : null}

      {feedback ? (
        <p className={`rounded-xl px-3 py-2 text-xs font-semibold ${feedback.tone === "success" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
          {feedback.text}
        </p>
      ) : null}

      {meals.length === 0 ? <p className="text-sm text-zinc-600">Aucun repas planifie pour le moment.</p> : null}

      {meals.map((meal) => (
        <div key={meal.id} className={`rounded-2xl border p-3 ${meal.isPinned ? "border-amber-200 bg-amber-50/40" : "border-zinc-200 bg-white"}`}>
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-zinc-900">{meal.title}</p>
            {meal.isPinned ? <Badge variant="warning">Epingle</Badge> : null}
            {meal.servedAtLabel ? <Badge variant="secondary">{meal.servedAtLabel}</Badge> : null}
          </div>
          {meal.description ? <p className="mt-2 text-sm text-zinc-700">{meal.description}</p> : null}
          {meal.recipe ? <p className="mt-2 whitespace-pre-wrap rounded-xl bg-white/70 px-2 py-2 text-xs text-zinc-700">{meal.recipe}</p> : null}
          {meal.linkedListId ? (
            <Link href={`/cercles/${circleId}/listes/${meal.linkedListId}`} className="mt-2 inline-flex text-xs font-semibold text-indigo-700 hover:underline">
              Liste liee: {meal.linkedListTitle ?? "Ouvrir"}
            </Link>
          ) : null}
          <p className="mt-2 text-xs text-zinc-500">Par {meal.createdByName}</p>

          {canManage ? (
            <div className="mt-2 flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  setEditing({
                    id: meal.id,
                    title: meal.title,
                    description: meal.description ?? "",
                    recipe: meal.recipe ?? "",
                    servedAtLabel: meal.servedAtLabel ?? "",
                    linkedListId: meal.linkedListId ?? "",
                    isPinned: meal.isPinned,
                  })
                }
              >
                <Pencil className="mr-1 h-3.5 w-3.5" />
                Modifier
              </Button>
              <ConfirmDestructiveDialog
                confirmValue={meal.title}
                itemType="repas"
                triggerLabel="Supprimer"
                warningMessage="Ce repas sera supprime definitivement."
                onConfirm={async () => {
                  const result = await deleteEventMealAction({ mealId: meal.id });
                  if (!result.success) {
                    setError(result.message ?? "Suppression impossible.");
                    return;
                  }
                  await refreshAfterAction("Repas supprime.");
                }}
              />
            </div>
          ) : null}

          {editing?.id === meal.id ? (
            <div className="mt-2 space-y-2 rounded-xl border border-amber-100 bg-amber-50/40 p-3">
              <Input value={editing.title} onChange={(event) => setEditing((prev) => (prev ? { ...prev, title: event.target.value } : prev))} placeholder="Titre" />
              <Input value={editing.servedAtLabel} onChange={(event) => setEditing((prev) => (prev ? { ...prev, servedAtLabel: event.target.value } : prev))} placeholder="Moment" />
              <Textarea value={editing.description} onChange={(event) => setEditing((prev) => (prev ? { ...prev, description: event.target.value } : prev))} placeholder="Description" className="min-h-20" />
              <Textarea value={editing.recipe} onChange={(event) => setEditing((prev) => (prev ? { ...prev, recipe: event.target.value } : prev))} placeholder="Recette" className="min-h-24" />
              <select
                value={editing.linkedListId}
                onChange={(event) => setEditing((prev) => (prev ? { ...prev, linkedListId: event.target.value } : prev))}
                className="h-10 w-full rounded-xl border border-amber-100 bg-white px-3 text-sm text-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
              >
                <option value="">Aucune liste liee</option>
                {listOptions.map((list) => (
                  <option key={list.id} value={list.id}>
                    {list.title}
                  </option>
                ))}
              </select>
              <label className="inline-flex items-center gap-2 text-sm text-zinc-700">
                <input type="checkbox" checked={editing.isPinned} onChange={(event) => setEditing((prev) => (prev ? { ...prev, isPinned: event.target.checked } : prev))} />
                Epingler ce repas
              </label>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  onClick={async () => {
                    if (!editing) return;
                    const result = await updateEventMealAction({
                      mealId: editing.id,
                      title: editing.title,
                      description: editing.description,
                      recipe: editing.recipe,
                      servedAtLabel: editing.servedAtLabel,
                      linkedListId: editing.linkedListId,
                      isPinned: editing.isPinned,
                    });
                    if (!result.success) {
                      setError(result.message ?? "Modification impossible.");
                      return;
                    }
                    setEditing(null);
                    await refreshAfterAction("Repas modifie.");
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
