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
  phone: z.string().optional(),
  address: z.string().optional(),
  allergies: z.string().optional(),
  foodPreferences: z.string().optional(),
  giftIdeas: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export function ProfileForm({ initialValues }: { initialValues: FormValues }) {
  const [feedback, setFeedback] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: initialValues,
  });

  return (
    <form
      className="space-y-3 rounded-2xl border border-zinc-200 bg-white p-4"
      onSubmit={form.handleSubmit(async (values) => {
        setIsSubmitting(true);
        setFeedback("");
        const result = await updateProfileAction(values);
        setIsSubmitting(false);
        setFeedback(result.message ?? (result.success ? "Profil enregistre." : "Erreur profil."));
      })}
    >
      <div className="grid grid-cols-2 gap-2">
        <Input placeholder="Prenom" {...form.register("firstName")} />
        <Input placeholder="Nom" {...form.register("lastName")} />
      </div>
      <Input placeholder="Telephone" {...form.register("phone")} />
      <Input placeholder="Adresse" {...form.register("address")} />
      <Textarea placeholder="Allergies" {...form.register("allergies")} />
      <Textarea placeholder="Preferences alimentaires" {...form.register("foodPreferences")} />
      <Textarea placeholder="Idees cadeaux" {...form.register("giftIdeas")} />
      {feedback ? <p className="text-xs text-zinc-600">{feedback}</p> : null}
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Enregistrement..." : "Enregistrer le profil"}
      </Button>
    </form>
  );
}
