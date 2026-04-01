"use client";

import { InvitePermission } from "@prisma/client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { createCircleAction, updateCircleAction } from "@/actions/circles";
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

export function CreateCircleForm({
  mode = "create",
  circleId,
  initialValues,
}: {
  mode?: "create" | "edit";
  circleId?: string;
  initialValues?: Partial<FormValues>;
}) {
  const router = useRouter();
  const [feedback, setFeedback] = useState<string>("");
  const [isSuccessFeedback, setIsSuccessFeedback] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: initialValues?.name ?? "",
      photoUrl: initialValues?.photoUrl ?? "",
      description: initialValues?.description ?? "",
      rules: initialValues?.rules ?? "",
      invitePermission: initialValues?.invitePermission ?? InvitePermission.ADMINS_AND_ADULTS,
    },
  });

  return (
    <form
      className="space-y-3 rounded-3xl border border-indigo-100 bg-white p-4"
      onSubmit={form.handleSubmit(async (values) => {
        setIsSubmitting(true);
        setFeedback("");
        setIsSuccessFeedback(false);
        const result = mode === "edit" && circleId ? await updateCircleAction({ ...values, circleId }) : await createCircleAction(values);
        setIsSubmitting(false);

        if (!result.success) {
          setFeedback(result.message ?? (mode === "edit" ? "Erreur lors de la modification du cercle." : "Erreur lors de la creation du cercle."));
          return;
        }

        setIsSuccessFeedback(true);
        setFeedback(mode === "edit" ? "Cercle modifie avec succes." : "Cercle cree avec succes.");

        router.push(`/cercles/${result.circleId}`);
      })}
    >
      <h2 className="font-serif text-lg font-bold text-zinc-900">{mode === "edit" ? "Modifier le cercle" : "Creer un cercle"}</h2>
      <Input placeholder="Nom du cercle" {...form.register("name")} />
      <Input placeholder="Photo (URL facultative)" {...form.register("photoUrl")} />
      <Textarea placeholder="Description" {...form.register("description")} />
      <Textarea placeholder="Regles de base" {...form.register("rules")} />
      <select className="h-10 w-full rounded-xl border border-indigo-100 bg-white px-3 text-sm text-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300" {...form.register("invitePermission")}>
        <option value={InvitePermission.ADMINS_ONLY}>Seuls les admins peuvent inviter</option>
        <option value={InvitePermission.ADMINS_AND_ADULTS}>Admins et adultes peuvent inviter</option>
      </select>
      {feedback ? (
        <p className={`rounded-xl px-3 py-2 text-xs font-semibold ${isSuccessFeedback ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
          {feedback}
        </p>
      ) : null}
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Enregistrement..." : mode === "edit" ? "Enregistrer les changements" : "Creer le cercle"}
      </Button>
    </form>
  );
}
