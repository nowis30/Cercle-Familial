"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { updateNotificationPreferencesAction } from "@/actions/profile";

import { Button } from "@/components/ui/button";

const schema = z.object({
  birthdaysChannel: z.enum(["APP", "EMAIL", "NONE"]),
  upcomingEventsChannel: z.enum(["APP", "EMAIL", "NONE"]),
  rsvpMissingChannel: z.enum(["APP", "EMAIL", "NONE"]),
  urgentItemsChannel: z.enum(["APP", "EMAIL", "NONE"]),
  newMessagesChannel: z.enum(["APP", "EMAIL", "NONE"]),
});

type FormValues = z.infer<typeof schema>;

export function NotificationPreferencesForm({ initialValues }: { initialValues: FormValues }) {
  const [feedback, setFeedback] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register, handleSubmit } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: initialValues,
  });

  return (
    <form
      onSubmit={handleSubmit(async (values) => {
        setIsSubmitting(true);
        const result = await updateNotificationPreferencesAction(values);
        setIsSubmitting(false);
        setFeedback(result.message ?? (result.success ? "Preferences enregistrees." : "Erreur."));
      })}
      className="space-y-3 rounded-2xl border border-zinc-200 bg-white p-4"
    >
      <div>
        <label className="mb-1 block text-sm font-medium">Anniversaires</label>
        <select className="h-10 w-full rounded-xl border border-zinc-300 px-3" {...register("birthdaysChannel")}>
          <option value="APP">Dans l&apos;application</option>
          <option value="EMAIL">Par courriel</option>
          <option value="NONE">Aucune</option>
        </select>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Evenements a venir</label>
        <select className="h-10 w-full rounded-xl border border-zinc-300 px-3" {...register("upcomingEventsChannel")}>
          <option value="APP">Dans l&apos;application</option>
          <option value="EMAIL">Par courriel</option>
          <option value="NONE">Aucune</option>
        </select>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">RSVP manquants</label>
        <select className="h-10 w-full rounded-xl border border-zinc-300 px-3" {...register("rsvpMissingChannel")}>
          <option value="APP">Dans l&apos;application</option>
          <option value="EMAIL">Par courriel</option>
          <option value="NONE">Aucune</option>
        </select>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Items urgents</label>
        <select className="h-10 w-full rounded-xl border border-zinc-300 px-3" {...register("urgentItemsChannel")}>
          <option value="APP">Dans l&apos;application</option>
          <option value="EMAIL">Par courriel</option>
          <option value="NONE">Aucune</option>
        </select>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Nouveaux messages</label>
        <select className="h-10 w-full rounded-xl border border-zinc-300 px-3" {...register("newMessagesChannel")}>
          <option value="APP">Dans l&apos;application</option>
          <option value="EMAIL">Par courriel</option>
          <option value="NONE">Aucune</option>
        </select>
      </div>

      {feedback ? <p className="text-xs text-zinc-600">{feedback}</p> : null}
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Enregistrement..." : "Enregistrer"}
      </Button>
    </form>
  );
}
