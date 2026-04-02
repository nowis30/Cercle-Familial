"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { updateManagedFamilyMemberAction, deleteManagedFamilyMemberAction } from "@/actions/profile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { ConfirmDestructiveDialog } from "@/components/shared/confirm-destructive-dialog";

const schema = z.object({
  firstName: z.string().min(2, "Prenom requis"),
  lastName: z.string().max(80).optional(),
  relationLabel: z.string().max(40).optional(),
  birthDate: z
    .string()
    .optional()
    .refine((value) => !value || /^\d{4}-\d{2}-\d{2}$/.test(value), "Date invalide."),
  phone: z.string().optional(),
  address: z.string().optional(),
  allergies: z.string().optional(),
  foodPreferences: z.string().optional(),
  giftIdeas: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export function MemberProfileForm({
  memberId,
  initialValues,
}: {
  memberId: string;
  initialValues: FormValues;
}) {
  const router = useRouter();
  const [feedback, setFeedback] = useState("");
  const [isSuccessFeedback, setIsSuccessFeedback] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: initialValues,
  });

  const fullName = `${initialValues.firstName}${initialValues.lastName ? ` ${initialValues.lastName}` : ""}`.trim();

  return (
    <div className="space-y-4">
      <form
        className="space-y-4 rounded-3xl border border-indigo-100 bg-white p-4"
        onSubmit={form.handleSubmit(async (values) => {
          setIsSubmitting(true);
          setFeedback("");
          setIsSuccessFeedback(false);
          const result = await updateManagedFamilyMemberAction({
            memberId,
            ...values,
          });
          setIsSubmitting(false);
          setIsSuccessFeedback(Boolean(result.success));
          setFeedback(result.message ?? (result.success ? "Fiche enregistree." : "Erreur fiche."));
          if (result.success) {
            router.refresh();
          }
        })}
      >
        <div className="grid grid-cols-2 gap-2">
          <Input placeholder="Prenom" {...form.register("firstName")} />
          <Input placeholder="Nom" {...form.register("lastName")} />
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Lien familial
          </label>
          <select
            className="h-10 w-full rounded-xl border border-indigo-100 bg-white px-3 text-sm text-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300"
            {...form.register("relationLabel")}
          >
            <option value="Enfant">Enfant</option>
            <option value="Conjoint">Conjoint</option>
            <option value="Parent">Parent</option>
            <option value="Autre">Autre</option>
          </select>
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold text-zinc-600" htmlFor="birthDate">
            Date de naissance
          </label>
          <Input id="birthDate" type="date" {...form.register("birthDate")} />
          {form.formState.errors.birthDate ? (
            <p className="mt-1 text-xs text-rose-600">{form.formState.errors.birthDate.message}</p>
          ) : null}
        </div>

        <Input placeholder="Téléphone" {...form.register("phone")} />
        <Input placeholder="Adresse" {...form.register("address")} />
        <Textarea placeholder="Allergies" {...form.register("allergies")} />
        <Textarea placeholder="Préférences alimentaires" {...form.register("foodPreferences")} />
        <Textarea placeholder="Idées cadeaux" {...form.register("giftIdeas")} />

        {feedback ? (
          <p
            className={`rounded-xl px-3 py-2 text-xs font-semibold ${
              isSuccessFeedback ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
            }`}
          >
            {feedback}
          </p>
        ) : null}

        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Enregistrement..." : "Enregistrer la fiche"}
        </Button>
      </form>

      <Card className="space-y-3">
        <p className="font-serif text-lg font-bold text-zinc-900">Actions</p>
        <div>
          <ConfirmDestructiveDialog
            confirmValue={fullName}
            itemType="fiche"
            triggerLabel="Supprimer cette fiche"
            triggerVariant="destructive"
            warningMessage={`${fullName} sera supprimé de votre famille gérée et retiré des participations liées.`}
            onConfirm={async () => {
              const result = await deleteManagedFamilyMemberAction({ memberId });
              if (!result.success) {
                setFeedback(result.message ?? "Suppression impossible.");
                return;
              }
              router.push("/profil");
            }}
          />
        </div>
      </Card>

      <div className="flex gap-2">
        <Button variant="secondary" onClick={() => router.push("/profil")} className="flex-1">
          Retour au profil
        </Button>
      </div>
    </div>
  );
}
