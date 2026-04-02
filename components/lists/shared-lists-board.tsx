"use client";

import { CircleRole, SharedListType } from "@prisma/client";
import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";
import { Check, Pencil, Plus, Trash2 } from "lucide-react";

import {
  createSharedListAction,
  createSharedListItemAction,
  deleteSharedListAction,
  deleteSharedListItemAction,
  setSharedListArchivedAction,
  toggleSharedListItemCheckedAction,
  updateSharedListAction,
  updateSharedListItemAction,
} from "@/actions/lists";
import { ConfirmDestructiveDialog } from "@/components/shared/confirm-destructive-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type MemberOption = {
  id: string;
  name: string;
  role: CircleRole;
};

type SharedListItemView = {
  id: string;
  label: string;
  quantity: number;
  comment: string | null;
  isChecked: boolean;
  createdById: string;
  assigneeUserId: string | null;
  assigneeName: string | null;
  checkedByName: string | null;
  canManage: boolean;
};

type SharedListView = {
  id: string;
  title: string;
  note: string | null;
  type: SharedListType;
  isArchived: boolean;
  createdById: string;
  createdByName: string;
  canManage: boolean;
  items: SharedListItemView[];
};

type SharedListsBoardProps = {
  circleId: string;
  canCreateLists: boolean;
  members: MemberOption[];
  activeLists: SharedListView[];
  archivedLists: SharedListView[];
  hideCreateSection?: boolean;
  showDetailLinks?: boolean;
};

const listTypeLabels: Record<SharedListType, string> = {
  EPICERIE: "Epicerie",
  LISTE_LIBRE: "Liste libre",
  PREPARATION_FETE: "Preparation de fete",
  ACHATS_CADEAUX: "Achats cadeaux",
};

const sharedListTypes = Object.values(SharedListType) as SharedListType[];

type ItemDraft = {
  label: string;
  quantity: string;
  comment: string;
  assigneeUserId: string;
};

type ItemEditState = {
  itemId: string;
  label: string;
  quantity: string;
  comment: string;
  assigneeUserId: string;
};

type ListEditState = {
  listId: string;
  title: string;
  note: string;
  type: SharedListType;
};

export function SharedListsBoard({
  circleId,
  canCreateLists,
  members,
  activeLists,
  archivedLists,
  hideCreateSection = false,
  showDetailLinks = false,
}: SharedListsBoardProps) {
  const router = useRouter();
  const [feedback, setFeedback] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [newListTitle, setNewListTitle] = useState("");
  const [newListNote, setNewListNote] = useState("");
  const [newListType, setNewListType] = useState<SharedListType>(SharedListType.LISTE_LIBRE);

  const [itemDrafts, setItemDrafts] = useState<Record<string, ItemDraft>>({});
  const [itemEditing, setItemEditing] = useState<ItemEditState | null>(null);
  const [listEditing, setListEditing] = useState<ListEditState | null>(null);

  const memberOptions = useMemo(
    () => [...members].sort((a, b) => a.name.localeCompare(b.name, "fr-CA", { sensitivity: "base" })),
    [members],
  );

  function setSuccess(text: string) {
    setFeedback({ tone: "success", text });
  }

  function setError(text: string) {
    setFeedback({ tone: "error", text });
  }

  async function refreshAfterAction(successMessage?: string) {
    router.refresh();
    if (successMessage) {
      setSuccess(successMessage);
    }
  }

  async function onCreateList(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canCreateLists) {
      setError("Seuls les adultes et admins peuvent creer une liste.");
      return;
    }

    setIsSubmitting(true);
    const result = await createSharedListAction({
      circleId,
      title: newListTitle,
      note: newListNote,
      type: newListType,
    });
    setIsSubmitting(false);

    if (!result.success) {
      setError(result.message ?? "Creation impossible.");
      return;
    }

    setNewListTitle("");
    setNewListNote("");
    setNewListType(SharedListType.LISTE_LIBRE);
    await refreshAfterAction("Liste creee.");
  }

  async function onCreateItem(listId: string) {
    const draft = itemDrafts[listId] ?? { label: "", quantity: "1", comment: "", assigneeUserId: "" };

    const result = await createSharedListItemAction({
      listId,
      label: draft.label,
      quantity: Number(draft.quantity) || 1,
      comment: draft.comment,
      assigneeUserId: draft.assigneeUserId || undefined,
    });

    if (!result.success) {
      setError(result.message ?? "Ajout impossible.");
      return;
    }

    setItemDrafts((prev) => ({
      ...prev,
      [listId]: { label: "", quantity: "1", comment: "", assigneeUserId: "" },
    }));

    await refreshAfterAction("Item ajoute.");
  }

  return (
    <div className="space-y-4">
      {!hideCreateSection ? (
        <Card className="space-y-3 bg-gradient-to-br from-white to-indigo-50/50">
        <CardTitle className="font-serif text-lg">Listes partagees</CardTitle>
        <CardDescription>
          Des listes simples pour l&apos;epicerie, les achats et la preparation des fetes.
        </CardDescription>

        <form className="space-y-2" onSubmit={onCreateList}>
          <Input
            value={newListTitle}
            onChange={(event) => setNewListTitle(event.target.value)}
            placeholder="Titre de la liste"
            disabled={!canCreateLists || isSubmitting}
          />
          <Textarea
            value={newListNote}
            onChange={(event) => setNewListNote(event.target.value)}
            placeholder="Note (facultative)"
            disabled={!canCreateLists || isSubmitting}
            className="min-h-20"
          />
          <select
            value={newListType}
            onChange={(event) => setNewListType(event.target.value as SharedListType)}
            disabled={!canCreateLists || isSubmitting}
            className="h-11 w-full rounded-xl border border-indigo-100 bg-white px-3 text-sm text-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300"
          >
            {sharedListTypes.map((type) => (
              <option key={type} value={type}>
                {listTypeLabels[type]}
              </option>
            ))}
          </select>
          <Button type="submit" className="h-11 w-full" disabled={!canCreateLists || isSubmitting}>
            <Plus className="mr-1 h-4 w-4" />
            Creer la liste
          </Button>
          {!canCreateLists ? <p className="text-xs font-medium text-zinc-600">Creation reservee aux adultes et admins.</p> : null}
        </form>

        {feedback ? (
          <p
            className={`rounded-xl px-3 py-2 text-xs font-semibold ${
              feedback.tone === "success" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
            }`}
          >
            {feedback.text}
          </p>
        ) : null}
        </Card>
      ) : feedback ? (
        <p
          className={`rounded-xl px-3 py-2 text-xs font-semibold ${
            feedback.tone === "success" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
          }`}
        >
          {feedback.text}
        </p>
      ) : null}

      {activeLists.length === 0 ? (
        <Card>
          <p className="text-sm text-zinc-600">Aucune liste active pour ce cercle.</p>
        </Card>
      ) : null}

      {activeLists.map((list) => {
        const currentDraft = itemDrafts[list.id] ?? { label: "", quantity: "1", comment: "", assigneeUserId: "" };

        return (
          <Card key={list.id} className="space-y-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-serif text-lg font-bold text-zinc-900">{list.title}</p>
                <div className="mt-1 flex items-center gap-2 text-xs text-zinc-600">
                  <Badge variant="secondary">{listTypeLabels[list.type]}</Badge>
                  <span>Creee par {list.createdByName}</span>
                </div>
                {list.note ? <p className="mt-2 text-sm text-zinc-700">{list.note}</p> : null}
              </div>
              <div className="flex flex-wrap gap-2">
              {showDetailLinks ? (
                <Button size="sm" variant="ghost" onClick={() => router.push(`/cercles/${circleId}/listes/${list.id}`)}>
                  Ouvrir
                </Button>
              ) : null}
              {list.canManage ? (
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      setListEditing({
                        listId: list.id,
                        title: list.title,
                        note: list.note ?? "",
                        type: list.type,
                      })
                    }
                  >
                    <Pencil className="mr-1 h-3.5 w-3.5" />
                    Modifier
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={async () => {
                      const result = await setSharedListArchivedAction({ listId: list.id, archived: true });
                      if (!result.success) {
                        setError(result.message ?? "Archivage impossible.");
                        return;
                      }
                      await refreshAfterAction("Liste archivee.");
                    }}
                  >
                    Archiver
                  </Button>
                  <ConfirmDestructiveDialog
                    confirmValue={list.title}
                    itemType="liste"
                    triggerLabel="Supprimer"
                    warningMessage="La liste et tous ses items seront supprimes."
                    onConfirm={async () => {
                      const result = await deleteSharedListAction({ listId: list.id });
                      if (!result.success) {
                        setError(result.message ?? "Suppression impossible.");
                        return;
                      }
                      await refreshAfterAction("Liste supprimee.");
                    }}
                  />
                </div>
              ) : null}
              </div>
            </div>

            {listEditing?.listId === list.id ? (
              <div className="space-y-2 rounded-2xl border border-indigo-100 bg-indigo-50/40 p-3">
                <Input
                  value={listEditing.title}
                  onChange={(event) => setListEditing((prev) => (prev ? { ...prev, title: event.target.value } : prev))}
                  placeholder="Titre"
                />
                <Textarea
                  className="min-h-20"
                  value={listEditing.note}
                  onChange={(event) => setListEditing((prev) => (prev ? { ...prev, note: event.target.value } : prev))}
                  placeholder="Note"
                />
                <select
                  value={listEditing.type}
                  onChange={(event) =>
                    setListEditing((prev) => (prev ? { ...prev, type: event.target.value as SharedListType } : prev))
                  }
                  className="h-10 w-full rounded-xl border border-indigo-100 bg-white px-3 text-sm text-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300"
                >
                  {sharedListTypes.map((type) => (
                    <option key={type} value={type}>
                      {listTypeLabels[type]}
                    </option>
                  ))}
                </select>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    onClick={async () => {
                      if (!listEditing) return;
                      const result = await updateSharedListAction({
                        listId: listEditing.listId,
                        title: listEditing.title,
                        note: listEditing.note,
                        type: listEditing.type,
                      });
                      if (!result.success) {
                        setError(result.message ?? "Modification impossible.");
                        return;
                      }
                      setListEditing(null);
                      await refreshAfterAction("Liste modifiee.");
                    }}
                  >
                    Enregistrer
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setListEditing(null)}>
                    Annuler
                  </Button>
                </div>
              </div>
            ) : null}

            <div className="space-y-2">
              {list.items.length === 0 ? <p className="text-sm text-zinc-600">Aucun item pour le moment.</p> : null}
              {list.items.map((item) => (
                <div key={item.id} className="rounded-2xl border border-zinc-200/80 bg-white p-3">
                  <div className="flex items-start gap-2">
                    <button
                      type="button"
                      onClick={async () => {
                        const result = await toggleSharedListItemCheckedAction({
                          itemId: item.id,
                          checked: !item.isChecked,
                        });
                        if (!result.success) {
                          setError(result.message ?? "Mise a jour impossible.");
                          return;
                        }
                        await refreshAfterAction();
                      }}
                      className={`mt-0.5 flex h-7 w-7 items-center justify-center rounded-full border ${
                        item.isChecked ? "border-emerald-300 bg-emerald-50 text-emerald-700" : "border-zinc-300 text-zinc-500"
                      }`}
                      aria-label={item.isChecked ? "Marquer non fait" : "Marquer fait"}
                    >
                      {item.isChecked ? <Check className="h-4 w-4" /> : null}
                    </button>
                    <div className="min-w-0 flex-1">
                      <p className={`text-sm font-semibold ${item.isChecked ? "text-zinc-500 line-through" : "text-zinc-800"}`}>
                        {item.quantity > 1 ? `${item.quantity} x ` : ""}
                        {item.label}
                      </p>
                      {item.comment ? <p className="mt-1 text-xs text-zinc-600">{item.comment}</p> : null}
                      <p className="mt-1 text-xs text-zinc-500">
                        {item.assigneeName ? `Assigne a ${item.assigneeName}` : "Non assigne"}
                        {item.checkedByName ? ` • Coche par ${item.checkedByName}` : ""}
                      </p>
                    </div>
                  </div>

                  {item.canManage ? (
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          setItemEditing({
                            itemId: item.id,
                            label: item.label,
                            quantity: String(item.quantity),
                            comment: item.comment ?? "",
                            assigneeUserId: item.assigneeUserId ?? "",
                          })
                        }
                      >
                        <Pencil className="mr-1 h-3.5 w-3.5" />
                        Modifier
                      </Button>
                      <ConfirmDestructiveDialog
                        confirmValue={item.label}
                        itemType="item"
                        triggerLabel="Supprimer"
                        warningMessage="Cet item sera supprime definitivement."
                        onConfirm={async () => {
                          const result = await deleteSharedListItemAction({ itemId: item.id });
                          if (!result.success) {
                            setError(result.message ?? "Suppression impossible.");
                            return;
                          }
                          await refreshAfterAction("Item supprime.");
                        }}
                      />
                    </div>
                  ) : null}

                  {itemEditing?.itemId === item.id ? (
                    <div className="mt-2 space-y-2 rounded-xl border border-indigo-100 bg-indigo-50/40 p-3">
                      <Input
                        value={itemEditing.label}
                        onChange={(event) => setItemEditing((prev) => (prev ? { ...prev, label: event.target.value } : prev))}
                        placeholder="Libelle"
                      />
                      <Input
                        type="number"
                        min={1}
                        max={99}
                        value={itemEditing.quantity}
                        onChange={(event) => setItemEditing((prev) => (prev ? { ...prev, quantity: event.target.value } : prev))}
                        placeholder="Quantite"
                      />
                      <Input
                        value={itemEditing.comment}
                        onChange={(event) => setItemEditing((prev) => (prev ? { ...prev, comment: event.target.value } : prev))}
                        placeholder="Commentaire"
                      />
                      <select
                        value={itemEditing.assigneeUserId}
                        onChange={(event) =>
                          setItemEditing((prev) => (prev ? { ...prev, assigneeUserId: event.target.value } : prev))
                        }
                        className="h-10 w-full rounded-xl border border-indigo-100 bg-white px-3 text-sm text-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300"
                      >
                        <option value="">Non assigne</option>
                        {memberOptions.map((member) => (
                          <option key={member.id} value={member.id}>
                            {member.name}
                          </option>
                        ))}
                      </select>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          onClick={async () => {
                            if (!itemEditing) return;

                            const result = await updateSharedListItemAction({
                              itemId: itemEditing.itemId,
                              label: itemEditing.label,
                              quantity: Number(itemEditing.quantity) || 1,
                              comment: itemEditing.comment,
                              assigneeUserId: itemEditing.assigneeUserId,
                            });
                            if (!result.success) {
                              setError(result.message ?? "Modification impossible.");
                              return;
                            }

                            setItemEditing(null);
                            await refreshAfterAction("Item modifie.");
                          }}
                        >
                          Enregistrer
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setItemEditing(null)}>
                          Annuler
                        </Button>
                      </div>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>

            {!list.isArchived ? (
              <div className="space-y-2 rounded-2xl border border-indigo-100 bg-indigo-50/40 p-3">
                <p className="text-xs font-semibold text-zinc-700">Ajouter un item</p>
                <Input
                  value={currentDraft.label}
                  onChange={(event) =>
                    setItemDrafts((prev) => ({
                      ...prev,
                      [list.id]: { ...currentDraft, label: event.target.value },
                    }))
                  }
                  placeholder="Ex: lait 2%"
                />
                <Input
                  type="number"
                  min={1}
                  max={99}
                  value={currentDraft.quantity}
                  onChange={(event) =>
                    setItemDrafts((prev) => ({
                      ...prev,
                      [list.id]: { ...currentDraft, quantity: event.target.value },
                    }))
                  }
                  placeholder="Quantite"
                />
                <Input
                  value={currentDraft.comment}
                  onChange={(event) =>
                    setItemDrafts((prev) => ({
                      ...prev,
                      [list.id]: { ...currentDraft, comment: event.target.value },
                    }))
                  }
                  placeholder="Commentaire (facultatif)"
                />
                <select
                  value={currentDraft.assigneeUserId}
                  onChange={(event) =>
                    setItemDrafts((prev) => ({
                      ...prev,
                      [list.id]: { ...currentDraft, assigneeUserId: event.target.value },
                    }))
                  }
                  className="h-10 w-full rounded-xl border border-indigo-100 bg-white px-3 text-sm text-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300"
                >
                  <option value="">Non assigne</option>
                  {memberOptions.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.name}
                    </option>
                  ))}
                </select>
                <Button className="h-10 w-full" onClick={() => onCreateItem(list.id)}>
                  <Plus className="mr-1 h-4 w-4" />
                  Ajouter
                </Button>
              </div>
            ) : null}
          </Card>
        );
      })}

      {archivedLists.length > 0 ? (
        <Card className="space-y-2">
          <CardTitle className="text-base">Listes archivees</CardTitle>
          <div className="space-y-2">
            {archivedLists.map((list) => (
              <div key={list.id} className="rounded-2xl border border-zinc-200 bg-zinc-50 p-3">
                <p className="text-sm font-semibold text-zinc-700">{list.title}</p>
                <p className="text-xs text-zinc-500">{list.items.length} item(s)</p>
                {list.canManage ? (
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={async () => {
                        const result = await setSharedListArchivedAction({ listId: list.id, archived: false });
                        if (!result.success) {
                          setError(result.message ?? "Restauration impossible.");
                          return;
                        }
                        await refreshAfterAction("Liste restauree.");
                      }}
                    >
                      Restaurer
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={async () => {
                        const result = await deleteSharedListAction({ listId: list.id });
                        if (!result.success) {
                          setError(result.message ?? "Suppression impossible.");
                          return;
                        }
                        await refreshAfterAction("Liste supprimee.");
                      }}
                    >
                      <Trash2 className="mr-1 h-3.5 w-3.5" />
                      Supprimer
                    </Button>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </Card>
      ) : null}
    </div>
  );
}
