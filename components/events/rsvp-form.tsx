"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";

import { respondRsvpAction } from "@/actions/events";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const schema = z.object({
  response: z.enum(["JE_VIENS", "JE_NE_VIENS_PAS", "PEUT_ETRE"]),
  adultsCount: z.number().min(0),
  childrenCount: z.number().min(0),
  guestsDisplayName: z.string().optional(),
  note: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

type RSVPFormProps = {
  eventId: string;
  initial?: Partial<FormValues>;
};

export function RSVPForm({ eventId, initial }: RSVPFormProps) {
  const router = useRouter();
  const [feedback, setFeedback] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      response: initial?.response ?? "JE_VIENS",
      adultsCount: initial?.adultsCount ?? 1,
      childrenCount: initial?.childrenCount ?? 0,
      guestsDisplayName: initial?.guestsDisplayName ?? "",
      note: initial?.note ?? "",
    },
  });

  return (
    <form
      className="space-y-3 rounded-3xl border border-indigo-100 bg-white p-4"
      onSubmit={form.handleSubmit(async (values) => {
        setIsSubmitting(true);
        setFeedback("");
        const result = await respondRsvpAction({
          eventId,
          response: values.response,
          includeSelf: values.response === "JE_NE_VIENS_PAS" ? false : values.adultsCount > 0,
          linkedMemberIds: [],
          guestsDisplayName: values.guestsDisplayName,
          note: values.note,
        });
        setIsSubmitting(false);

        if (!result.success) {
          setFeedback(result.message ?? "Erreur RSVP.");
          return;
        }

        setFeedback("RSVP enregistre.");
        router.refresh();
      })}
    >
      <label className="block text-sm font-semibold text-zinc-700">Votre reponse</label>
      <select className="h-10 w-full rounded-xl border border-indigo-100 bg-white px-3 text-sm text-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300" {...form.register("response")}>
        <option value="JE_VIENS">Je viens</option>
        <option value="JE_NE_VIENS_PAS">Je ne viens pas</option>
        <option value="PEUT_ETRE">Peut-etre</option>
      </select>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="mb-1 block text-xs font-semibold text-zinc-500">Adultes</label>
          <Input type="number" min={0} {...form.register("adultsCount", { valueAsNumber: true })} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-zinc-500">Enfants</label>
          <Input type="number" min={0} {...form.register("childrenCount", { valueAsNumber: true })} />
        </div>
      </div>

      <Input placeholder="Noms des accompagnants" {...form.register("guestsDisplayName")} />
      <Input placeholder="Note RSVP" {...form.register("note")} />
      {feedback ? <p className="text-xs font-medium text-indigo-700">{feedback}</p> : null}
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Enregistrement..." : "Enregistrer RSVP"}
      </Button>
    </form>
  );
}
