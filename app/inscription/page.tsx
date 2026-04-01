"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { z } from "zod";

import { registerUserAction } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const schema = z
  .object({
    name: z.string().min(2, "Nom requis"),
    email: z.email("Courriel invalide"),
    password: z.string().min(8, "8 caracteres minimum"),
    passwordConfirm: z.string().min(8, "8 caracteres minimum"),
  })
  .refine((value) => value.password === value.passwordConfirm, {
    message: "Les mots de passe doivent etre identiques",
    path: ["passwordConfirm"],
  });

type FormValues = z.infer<typeof schema>;

export default function InscriptionPage() {
  const router = useRouter();
  const [feedback, setFeedback] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const getCallbackUrl = () => {
    if (typeof window === "undefined") return undefined;
    const requestedCallbackUrl = new URLSearchParams(window.location.search).get("callbackUrl");
    return requestedCallbackUrl && requestedCallbackUrl.startsWith("/") ? requestedCallbackUrl : undefined;
  };

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      passwordConfirm: "",
    },
  });

  return (
    <main className="mx-auto min-h-screen w-full max-w-xl bg-zinc-50 px-4 py-8">
      <h1 className="text-2xl font-semibold">Inscription</h1>
      <p className="mt-1 text-sm text-zinc-600">Creez un compte pour rejoindre vos cercles.</p>
      <form
        className="mt-6 space-y-3 rounded-2xl border border-zinc-200 bg-white p-4"
        onSubmit={form.handleSubmit(async (values) => {
          setIsSubmitting(true);
          setFeedback("");
          const result = await registerUserAction({
            name: values.name,
            email: values.email,
            password: values.password,
          });
          setIsSubmitting(false);

          if (!result.success) {
            setFeedback(result.message ?? "Impossible de creer le compte.");
            return;
          }

          setFeedback(result.message ?? "Compte cree.");
          const callbackUrl = getCallbackUrl();
          router.push(callbackUrl ? `/connexion?callbackUrl=${encodeURIComponent(callbackUrl)}` : "/connexion");
        })}
      >
        <Input placeholder="Nom complet" {...form.register("name")} />
        <Input placeholder="Courriel" type="email" {...form.register("email")} />
        <Input placeholder="Mot de passe" type="password" {...form.register("password")} />
        <Input placeholder="Confirmer le mot de passe" type="password" {...form.register("passwordConfirm")} />
        {feedback ? <p className="text-sm text-zinc-700">{feedback}</p> : null}
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? "Creation..." : "Creer mon compte"}
        </Button>
      </form>
    </main>
  );
}
