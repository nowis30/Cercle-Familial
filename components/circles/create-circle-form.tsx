"use client";

import { InvitePermission } from "@prisma/client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { createCircleAction } from "@/actions/circles";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const schema = z.object({
  name: z.string().min(2, "Nom requis"),
  photoUrl: z.string().optional(),
  description: z.string().optional(),
  rules: z.string().optional(),
  invitePermission: z.nativeEnum(InvitePermission),
});

type FormValues = z.infer<typeof schema>;

export function CreateCircleForm() {
  const router = useRouter();
  const [feedback, setFeedback] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      photoUrl: "",
      description: "",
      rules: "",
      invitePermission: InvitePermission.ADMINS_AND_ADULTS,
    },
  });

  return (
    <form
      className="space-y-3 rounded-2xl border border-zinc-200 bg-white p-4"
      onSubmit={form.handleSubmit(async (values) => {
        setIsSubmitting(true);
        setFeedback("");
        const result = await createCircleAction(values);
        setIsSubmitting(false);

        if (!result.success) {
          setFeedback(result.message ?? "Erreur lors de la creation du cercle.");
          return;
        }

        router.push(`/cercles/${result.circleId}`);
      })}
    >
      <h2 className="text-sm font-semibold">Creer un cercle</h2>
      <Input placeholder="Nom du cercle" {...form.register("name")} />
      <Input placeholder="Photo (URL facultative)" {...form.register("photoUrl")} />
      <Textarea placeholder="Description" {...form.register("description")} />
      <Textarea placeholder="Regles de base" {...form.register("rules")} />
      <select className="h-10 w-full rounded-xl border border-zinc-300 px-3 text-sm" {...form.register("invitePermission")}>
        <option value={InvitePermission.ADMINS_ONLY}>Seuls les admins peuvent inviter</option>
        <option value={InvitePermission.ADMINS_AND_ADULTS}>Admins et adultes peuvent inviter</option>
      </select>
      {feedback ? <p className="text-xs text-zinc-600">{feedback}</p> : null}
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Creation..." : "Creer le cercle"}
      </Button>
    </form>
  );
}
