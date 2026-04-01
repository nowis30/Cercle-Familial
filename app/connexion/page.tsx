"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function ConnexionPage() {
  const [email, setEmail] = useState("admin@cerclefamilial.local");
  const [password, setPassword] = useState("Famille123!");

  return (
    <main className="mx-auto min-h-screen w-full max-w-xl bg-zinc-50 px-4 py-8">
      <h1 className="text-2xl font-semibold">Connexion</h1>
      <p className="mt-1 text-sm text-zinc-600">Accedez a vos cercles familiaux.</p>
      <form
        className="mt-6 space-y-3 rounded-2xl border border-zinc-200 bg-white p-4"
        onSubmit={async (event) => {
          event.preventDefault();
          await signIn("credentials", {
            email,
            password,
            callbackUrl: "/tableau-de-bord",
          });
        }}
      >
        <Input value={email} onChange={(event) => setEmail(event.target.value)} type="email" placeholder="Courriel" />
        <Input value={password} onChange={(event) => setPassword(event.target.value)} type="password" placeholder="Mot de passe" />
        <Button type="submit" className="w-full">
          Se connecter
        </Button>
      </form>
      <Button
        variant="secondary"
        className="mt-3 w-full"
        onClick={async () => signIn("google", { callbackUrl: "/tableau-de-bord" })}
      >
        Continuer avec Google
      </Button>
    </main>
  );
}
