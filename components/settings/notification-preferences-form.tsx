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
  timezone: z.string().min(1, "Fuseau horaire requis"),
});

type FormValues = z.infer<typeof schema>;

export function NotificationPreferencesForm({
  initialValues,
  timeZoneOptions,
  appDefaultTimeZone,
}: {
  initialValues: FormValues;
  timeZoneOptions: string[];
  appDefaultTimeZone: string;
}) {
  const [feedback, setFeedback] = useState("");
  const [isSuccessFeedback, setIsSuccessFeedback] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register, handleSubmit } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: initialValues,
  });

  return (
    <form
      onSubmit={handleSubmit(async (values) => {
        setIsSubmitting(true);
        setIsSuccessFeedback(false);
        const result = await updateNotificationPreferencesAction(values);
        setIsSubmitting(false);
        setIsSuccessFeedback(Boolean(result.success));
        setFeedback(result.message ?? (result.success ? "Preferences enregistrees." : "Erreur."));
      })}
      className="space-y-3 rounded-3xl border border-indigo-100 bg-white p-4"
    >
      <div>
        <label className="mb-1 block text-sm font-semibold text-zinc-700">Fuseau horaire</label>
        <select className="h-10 w-full rounded-xl border border-indigo-100 bg-white px-3 text-sm text-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300" {...register("timezone")}>
          {timeZoneOptions.map((timeZone) => (
            <option key={timeZone} value={timeZone}>
              {timeZone}
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-zinc-500">Fuseau par defaut de l&apos;application: {appDefaultTimeZone}</p>
      </div>

      <div>
        <label className="mb-1 block text-sm font-semibold text-zinc-700">Anniversaires</label>
        <select className="h-10 w-full rounded-xl border border-indigo-100 bg-white px-3 text-sm text-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300" {...register("birthdaysChannel")}>
          <option value="APP">Dans l&apos;application</option>
          <option value="EMAIL">Par courriel</option>
          <option value="NONE">Aucune</option>
        </select>
      </div>

      <div>
        <label className="mb-1 block text-sm font-semibold text-zinc-700">Evenements a venir</label>
        <select className="h-10 w-full rounded-xl border border-indigo-100 bg-white px-3 text-sm text-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300" {...register("upcomingEventsChannel")}>
          <option value="APP">Dans l&apos;application</option>
          <option value="EMAIL">Par courriel</option>
          <option value="NONE">Aucune</option>
        </select>
      </div>

      <div>
        <label className="mb-1 block text-sm font-semibold text-zinc-700">RSVP manquants</label>
        <select className="h-10 w-full rounded-xl border border-indigo-100 bg-white px-3 text-sm text-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300" {...register("rsvpMissingChannel")}>
          <option value="APP">Dans l&apos;application</option>
          <option value="EMAIL">Par courriel</option>
          <option value="NONE">Aucune</option>
        </select>
      </div>

      <div>
        <label className="mb-1 block text-sm font-semibold text-zinc-700">Items urgents</label>
        <select className="h-10 w-full rounded-xl border border-indigo-100 bg-white px-3 text-sm text-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300" {...register("urgentItemsChannel")}>
          <option value="APP">Dans l&apos;application</option>
          <option value="EMAIL">Par courriel</option>
          <option value="NONE">Aucune</option>
        </select>
      </div>

      <div>
        <label className="mb-1 block text-sm font-semibold text-zinc-700">Nouveaux messages</label>
        <select className="h-10 w-full rounded-xl border border-indigo-100 bg-white px-3 text-sm text-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300" {...register("newMessagesChannel")}>
          <option value="APP">Dans l&apos;application</option>
          <option value="EMAIL">Par courriel</option>
          <option value="NONE">Aucune</option>
        </select>
      </div>

      {feedback ? (
        <p className={`rounded-xl px-3 py-2 text-xs font-semibold ${isSuccessFeedback ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
          {feedback}
        </p>
      ) : null}
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Enregistrement..." : "Enregistrer"}
      </Button>
    </form>
  );
}
