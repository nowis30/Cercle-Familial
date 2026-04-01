"use client";

import { EventType } from "@prisma/client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { createEventAction, updateEventAction } from "@/actions/events";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const schema = z.object({
  circleId: z.string().min(1, "Cercle requis"),
  title: z.string().min(2, "Titre requis"),
  type: z.nativeEnum(EventType),
  startsAt: z.string().min(1, "Date requise"),
  endsAt: z.string().optional(),
  locationName: z.string().min(2, "Lieu requis"),
  address: z.string().optional(),
  description: z.string().optional(),
  invitedUserIds: z.array(z.string()),
}).superRefine((values, ctx) => {
  if (!values.endsAt) return;

  const startsAt = new Date(values.startsAt);
  const endsAt = new Date(values.endsAt);

  if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) return;

  if (endsAt < startsAt) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["endsAt"],
      message: "L'heure de fin ne peut pas etre avant l'heure de debut.",
    });
  }
});

type FormValues = z.infer<typeof schema>;

type MemberOption = { id: string; name: string };
type CircleOption = { id: string; name: string };

type EventInitialValues = {
  circleId?: string;
  title?: string;
  type?: EventType;
  startsAt?: string;
  endsAt?: string;
  locationName?: string;
  address?: string;
  description?: string;
  invitedUserIds?: string[];
};

export function CreateEventForm({
  circleId,
  members,
  initialStartsAt,
  initialValues,
  availableCircles,
  mode = "create",
  eventId,
}: {
  circleId: string;
  members: MemberOption[];
  initialStartsAt?: string;
  initialValues?: EventInitialValues;
  availableCircles?: CircleOption[];
  mode?: "create" | "edit";
  eventId?: string;
}) {
  const router = useRouter();
  const [feedback, setFeedback] = useState<string>("");
  const [isSuccessFeedback, setIsSuccessFeedback] = useState(false);
  const [isErrorFeedback, setIsErrorFeedback] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      circleId: initialValues?.circleId ?? circleId,
      title: initialValues?.title ?? "",
      type: initialValues?.type ?? EventType.SOUPER_FAMILIAL,
      startsAt: initialValues?.startsAt ?? initialStartsAt ?? "",
      endsAt: initialValues?.endsAt ?? "",
      locationName: initialValues?.locationName ?? "",
      address: initialValues?.address ?? "",
      description: initialValues?.description ?? "",
      invitedUserIds: initialValues?.invitedUserIds ?? [],
    },
  });

  return (
    <form
      className="space-y-3 rounded-3xl border border-indigo-100 bg-white p-4"
      onSubmit={form.handleSubmit(async (values) => {
        setIsSubmitting(true);
        setFeedback("");
        setIsSuccessFeedback(false);
        setIsErrorFeedback(false);

        const result =
          mode === "edit" && eventId
            ? await updateEventAction({
                eventId,
                circleId: values.circleId,
                title: values.title,
                type: values.type,
                description: values.description,
                startsAt: new Date(values.startsAt),
                endsAt: values.endsAt ? new Date(values.endsAt) : undefined,
                locationName: values.locationName,
                address: values.address,
                invitedUserIds: values.invitedUserIds,
              })
            : await createEventAction({
                circleId: values.circleId,
                title: values.title,
                type: values.type,
                description: values.description,
                startsAt: new Date(values.startsAt),
                endsAt: values.endsAt ? new Date(values.endsAt) : undefined,
                locationName: values.locationName,
                address: values.address,
                invitedUserIds: values.invitedUserIds,
              });

        setIsSubmitting(false);
        if (!result.success) {
          setIsErrorFeedback(true);
          setFeedback(result.message ?? (mode === "edit" ? "Impossible de modifier l'evenement." : "Impossible de creer l'evenement."));
          return;
        }

        setIsSuccessFeedback(true);
        setIsErrorFeedback(false);
        setFeedback(mode === "edit" ? "Evenement modifie avec succes." : "Evenement cree avec succes.");

        const targetCircleId = "circleId" in result && result.circleId ? result.circleId : values.circleId;
        router.push(`/cercles/${targetCircleId}/evenements/${result.eventId}`);
      })}
    >
      {availableCircles && availableCircles.length > 0 ? (
        <>
          <label className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Cercle</label>
          <select className="h-10 w-full rounded-xl border border-indigo-100 bg-white px-3 text-sm text-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300" {...form.register("circleId")}>
            {availableCircles.map((circle) => (
              <option key={circle.id} value={circle.id}>
                {circle.name}
              </option>
            ))}
          </select>
          {form.formState.errors.circleId ? <p className="text-xs font-semibold text-rose-700">{form.formState.errors.circleId.message}</p> : null}
        </>
      ) : null}

      <Input placeholder="Titre" {...form.register("title")} />
      {form.formState.errors.title ? <p className="text-xs font-semibold text-rose-700">{form.formState.errors.title.message}</p> : null}
      <select className="h-10 w-full rounded-xl border border-indigo-100 bg-white px-3 text-sm text-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300" {...form.register("type")}>
        <option value={EventType.NOEL}>Noel</option>
        <option value={EventType.PAQUES}>Paques</option>
        <option value={EventType.RESTAURANT}>Restaurant</option>
        <option value={EventType.FETE_ENFANT}>Fete d&apos;enfant</option>
        <option value={EventType.SOUPER_FAMILIAL}>Souper familial</option>
        <option value={EventType.ANNIVERSAIRE}>Anniversaire</option>
        <option value={EventType.REUNION_FAMILIALE}>Reunion familiale</option>
        <option value={EventType.AUTRE}>Autre</option>
      </select>
      {form.formState.errors.type ? <p className="text-xs font-semibold text-rose-700">{form.formState.errors.type.message}</p> : null}
      <label className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Date et heure de debut</label>
      <Input type="datetime-local" {...form.register("startsAt")} />
      {form.formState.errors.startsAt ? <p className="text-xs font-semibold text-rose-700">{form.formState.errors.startsAt.message}</p> : null}
      <label className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Date et heure de fin (optionnel)</label>
      <Input type="datetime-local" {...form.register("endsAt")} />
      <p className="text-xs text-zinc-500">Si vide, l&apos;evenement sera enregistre sans heure de fin.</p>
      {form.formState.errors.endsAt ? <p className="text-xs font-semibold text-rose-700">{form.formState.errors.endsAt.message}</p> : null}
      <Input placeholder="Lieu" {...form.register("locationName")} />
      {form.formState.errors.locationName ? <p className="text-xs font-semibold text-rose-700">{form.formState.errors.locationName.message}</p> : null}
      <Input placeholder="Adresse" {...form.register("address")} />
      <Textarea placeholder="Description" {...form.register("description")} />

      <div className="space-y-2 rounded-2xl border border-indigo-100 bg-indigo-50/40 p-3">
        <p className="text-sm font-semibold text-zinc-800">Invites cibles</p>
        <p className="text-xs text-zinc-600">Les invites sont appliquees pour le cercle selectionne.</p>
        {members.map((member) => (
          <label key={member.id} className="flex items-center gap-2 rounded-xl px-2 py-1 text-sm text-zinc-700 hover:bg-white/70">
            <input className="h-4 w-4 rounded border-indigo-200 text-indigo-600 focus:ring-indigo-300" type="checkbox" value={member.id} {...form.register("invitedUserIds")} />
            <span className="font-medium">{member.name}</span>
          </label>
        ))}
      </div>

      {feedback ? (
        <p className={`rounded-xl px-3 py-2 text-xs font-semibold ${isSuccessFeedback ? "bg-emerald-50 text-emerald-700" : isErrorFeedback ? "bg-rose-50 text-rose-700" : "bg-zinc-100 text-zinc-700"}`}>
          {feedback}
        </p>
      ) : null}
      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? (mode === "edit" ? "Enregistrement..." : "Creation...") : mode === "edit" ? "Enregistrer les changements" : "Creer l'evenement"}
      </Button>
    </form>
  );
}
