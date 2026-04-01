"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import {
  createManagedFamilyMemberAction,
  deleteManagedFamilyMemberAction,
  updateManagedFamilyMemberAction,
} from "@/actions/profile";
import { ConfirmDestructiveDialog } from "@/components/shared/confirm-destructive-dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type ManagedFamilyMemberView = {
  id: string;
  firstName: string;
  lastName?: string | null;
  relationLabel?: string | null;
};

type FormValues = {
  firstName: string;
  lastName: string;
  relationLabel: string;
};

const RELATION_OPTIONS = ["Enfant", "Conjoint", "Parent", "Autre"];

function buildFullName(member: ManagedFamilyMemberView) {
  return `${member.firstName}${member.lastName ? ` ${member.lastName}` : ""}`.trim();
}

function getInitials(member: ManagedFamilyMemberView) {
  const first = member.firstName?.charAt(0) ?? "";
  const last = member.lastName?.charAt(0) ?? "";
  return `${first}${last}`.toUpperCase() || "?";
}

function toFormValues(member?: ManagedFamilyMemberView): FormValues {
  return {
    firstName: member?.firstName ?? "",
    lastName: member?.lastName ?? "",
    relationLabel: member?.relationLabel ?? "Enfant",
  };
}

export function FamilyMembersSection({ initialMembers }: { initialMembers: ManagedFamilyMemberView[] }) {
  const router = useRouter();
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [formValues, setFormValues] = useState<FormValues>(() => toFormValues());

  const members = useMemo(() => initialMembers, [initialMembers]);

  function startCreate() {
    setIsCreateOpen(true);
    setEditingMemberId(null);
    setFeedback("");
    setFormValues(toFormValues());
  }

  function startEdit(member: ManagedFamilyMemberView) {
    setIsCreateOpen(true);
    setEditingMemberId(member.id);
    setFeedback("");
    setFormValues(toFormValues(member));
  }

  return (
    <Card className="space-y-4">
      <div>
        <p className="font-serif text-lg font-bold text-zinc-900">Membres de ma famille</p>
        <p className="mt-1 text-sm text-zinc-600">Fiches sans compte utilisateur, gerables par l&apos;adulte proprietaire.</p>
      </div>

      <div className="space-y-2">
        {members.length === 0 ? (
          <p className="rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-3 text-sm text-zinc-600">Aucun membre cree pour le moment.</p>
        ) : null}

        {members.map((member) => {
          const fullName = buildFullName(member);
          return (
            <div key={member.id} className="flex items-center justify-between gap-3 rounded-2xl border border-indigo-100 bg-indigo-50/40 px-3 py-3">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700">
                  {getInitials(member)}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-zinc-900">{fullName}</p>
                  <p className="truncate text-xs text-zinc-600">{member.relationLabel || "Autre"}</p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Button size="sm" variant="outline" onClick={() => startEdit(member)}>
                  Modifier
                </Button>
                <ConfirmDestructiveDialog
                  confirmValue={fullName}
                  itemType="membre"
                  triggerLabel="Supprimer"
                  triggerVariant="destructive"
                  warningMessage="Ce membre sera retire de votre famille geree et des participations liees."
                  onConfirm={async () => {
                    const result = await deleteManagedFamilyMemberAction({ memberId: member.id });
                    if (!result.success) {
                      setFeedback(result.message ?? "Suppression impossible.");
                      return;
                    }
                    setFeedback("Membre supprime.");
                    router.refresh();
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {isCreateOpen ? (
        <div className="space-y-3 rounded-2xl border border-indigo-100 bg-white p-3">
          <p className="text-sm font-semibold text-zinc-900">{editingMemberId ? "Modifier la fiche" : "Nouvelle fiche famille"}</p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <Input
              placeholder="Prenom"
              value={formValues.firstName}
              onChange={(event) => setFormValues((prev) => ({ ...prev, firstName: event.target.value }))}
            />
            <Input
              placeholder="Nom"
              value={formValues.lastName}
              onChange={(event) => setFormValues((prev) => ({ ...prev, lastName: event.target.value }))}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-zinc-500">Lien familial</label>
            <select
              className="h-10 w-full rounded-xl border border-indigo-100 bg-white px-3 text-sm text-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300"
              value={formValues.relationLabel}
              onChange={(event) => setFormValues((prev) => ({ ...prev, relationLabel: event.target.value }))}
            >
              {RELATION_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              disabled={isSubmitting}
              onClick={async () => {
                setIsSubmitting(true);
                setFeedback("");

                const payload = {
                  firstName: formValues.firstName,
                  lastName: formValues.lastName,
                  relationLabel: formValues.relationLabel,
                };

                const result = editingMemberId
                  ? await updateManagedFamilyMemberAction({
                      memberId: editingMemberId,
                      ...payload,
                    })
                  : await createManagedFamilyMemberAction(payload);

                setIsSubmitting(false);
                if (!result.success) {
                  setFeedback(result.message ?? "Enregistrement impossible.");
                  return;
                }

                setFeedback(editingMemberId ? "Membre mis a jour." : "Membre ajoute.");
                setFormValues(toFormValues());
                setEditingMemberId(null);
                setIsCreateOpen(false);
                router.refresh();
              }}
            >
              {isSubmitting ? "Enregistrement..." : editingMemberId ? "Enregistrer la fiche" : "Créer ce membre"}
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                setIsCreateOpen(false);
                setEditingMemberId(null);
                setFormValues(toFormValues());
              }}
            >
              Annuler
            </Button>
          </div>
        </div>
      ) : null}

      <div className="pt-1">
        <Button className="w-full" onClick={startCreate}>
          Créer un membre de la famille
        </Button>
      </div>

      {feedback ? <p className="text-xs font-semibold text-indigo-700">{feedback}</p> : null}
    </Card>
  );
}
