"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { updateProfileAction } from "@/actions/profile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const schema = z.object({
  firstName: z.string().min(2, "Prenom requis"),
  lastName: z.string().min(2, "Nom requis"),
  birthDate: z
    .string()
    .optional()
    .refine((value) => !value || /^\d{4}-\d{2}-\d{2}$/.test(value), "Date de naissance invalide."),
  phone: z.string().optional(),
  address: z.string().optional(),
  allergies: z.string().optional(),
  foodPreferences: z.string().optional(),
  giftIdeas: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export function ProfileForm({ initialValues }: { initialValues: FormValues }) {
  const [feedback, setFeedback] = useState("");
  const [isSuccessFeedback, setIsSuccessFeedback] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: initialValues,
  });

  return (
    <form
      className="space-y-4 rounded-3xl border border-indigo-100 bg-white p-4"
      onSubmit={form.handleSubmit(async (values) => {
        setIsSubmitting(true);
        setFeedback("");
        setIsSuccessFeedback(false);
        const result = await updateProfileAction(values);
        setIsSubmitting(false);
        setIsSuccessFeedback(Boolean(result.success));
        setFeedback(result.message ?? (result.success ? "Profil enregistre." : "Erreur profil."));
      })}
    >
      <div className="grid grid-cols-2 gap-2">
        <Input placeholder="Prenom" {...form.register("firstName")} />
        <Input placeholder="Nom" {...form.register("lastName")} />
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
      <Input placeholder="Telephone" {...form.register("phone")} />
      <Input placeholder="Adresse" {...form.register("address")} />
      <Textarea placeholder="Allergies" {...form.register("allergies")} />
      <Textarea placeholder="Preferences alimentaires" {...form.register("foodPreferences")} />
      <Textarea placeholder="Idees cadeaux" {...form.register("giftIdeas")} />
      {feedback ? (
        <p className={`rounded-xl px-3 py-2 text-xs font-semibold ${isSuccessFeedback ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
          {feedback}
        </p>
      ) : null}
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Enregistrement..." : "Enregistrer le profil"}
      </Button>
    </form>
  );
}
