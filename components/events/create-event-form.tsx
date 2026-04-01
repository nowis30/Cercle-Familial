"use client";

import { EventType } from "@prisma/client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { createEventAction } from "@/actions/events";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const schema = z.object({
  title: z.string().min(2, "Titre requis"),
  type: z.nativeEnum(EventType),
  startsAt: z.string().min(1, "Date requise"),
  endsAt: z.string().optional(),
  locationName: z.string().min(2, "Lieu requis"),
  address: z.string().optional(),
  description: z.string().optional(),
  invitedUserIds: z.array(z.string()),
});

type FormValues = z.infer<typeof schema>;

type MemberOption = { id: string; name: string };

export function CreateEventForm({ circleId, members }: { circleId: string; members: MemberOption[] }) {
  const router = useRouter();
  const [feedback, setFeedback] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: "",
      type: EventType.SOUPER_FAMILIAL,
      startsAt: "",
      endsAt: "",
      locationName: "",
      address: "",
      description: "",
      invitedUserIds: [],
    },
  });

  return (
    <form
      className="space-y-3 rounded-2xl border border-zinc-200 bg-white p-4"
      onSubmit={form.handleSubmit(async (values) => {
        setIsSubmitting(true);
        setFeedback("");

        const result = await createEventAction({
          circleId,
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
          setFeedback(result.message ?? "Impossible de creer l'evenement.");
          return;
        }

        router.push(`/cercles/${circleId}/evenements/${result.eventId}`);
      })}
    >
      <Input placeholder="Titre" {...form.register("title")} />
      <select className="h-10 w-full rounded-xl border border-zinc-300 px-3" {...form.register("type")}>
        <option value={EventType.NOEL}>Noel</option>
        <option value={EventType.PAQUES}>Paques</option>
        <option value={EventType.RESTAURANT}>Restaurant</option>
        <option value={EventType.FETE_ENFANT}>Fete d&apos;enfant</option>
        <option value={EventType.SOUPER_FAMILIAL}>Souper familial</option>
        <option value={EventType.ANNIVERSAIRE}>Anniversaire</option>
        <option value={EventType.REUNION_FAMILIALE}>Reunion familiale</option>
        <option value={EventType.AUTRE}>Autre</option>
      </select>
      <Input type="datetime-local" {...form.register("startsAt")} />
      <Input type="datetime-local" {...form.register("endsAt")} />
      <Input placeholder="Lieu" {...form.register("locationName")} />
      <Input placeholder="Adresse" {...form.register("address")} />
      <Textarea placeholder="Description" {...form.register("description")} />

      <div className="space-y-2 rounded-xl bg-zinc-50 p-3">
        <p className="text-sm font-medium">Invites cibles</p>
        {members.map((member) => (
          <label key={member.id} className="flex items-center gap-2 text-sm">
            <input type="checkbox" value={member.id} {...form.register("invitedUserIds")} />
            {member.name}
          </label>
        ))}
      </div>

      {feedback ? <p className="text-xs text-zinc-600">{feedback}</p> : null}
      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? "Creation..." : "Creer l'evenement"}
      </Button>
    </form>
  );
}
