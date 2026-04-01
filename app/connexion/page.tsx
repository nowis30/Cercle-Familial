"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";

import { AppLogo } from "@/components/shared/app-logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function ConnexionPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  
  const getCallbackUrl = () => {
    if (typeof window === "undefined") return "/tableau-de-bord";

    const requestedCallbackUrl = new URLSearchParams(window.location.search).get("callbackUrl");
    return requestedCallbackUrl && requestedCallbackUrl.startsWith("/") ? requestedCallbackUrl : "/tableau-de-bord";
  };

  return (
    <main className="mx-auto min-h-screen w-full max-w-xl bg-zinc-50 px-4 py-8">
      <div className="mb-5 flex justify-center">
        <AppLogo />
      </div>
      <h1 className="text-2xl font-semibold">Connexion</h1>
      <p className="mt-1 text-sm text-zinc-600">Accedez a vos cercles familiaux.</p>
      <form
        className="mt-6 space-y-3 rounded-2xl border border-zinc-200 bg-white p-4"
        onSubmit={async (event) => {
          event.preventDefault();
          await signIn("credentials", {
            email,
            password,
            callbackUrl: getCallbackUrl(),
          });
        }}
      >
        <Input value={email} onChange={(event) => setEmail(event.target.value)} type="email" placeholder="Votre e-mail" />
        <Input value={password} onChange={(event) => setPassword(event.target.value)} type="password" placeholder="Votre mot de passe" />
        <Button type="submit" className="w-full">
          Se connecter
        </Button>
      </form>
      <Button
        variant="secondary"
        className="mt-3 w-full"
        onClick={async () => signIn("google", { callbackUrl: getCallbackUrl() })}
      >
        Continuer avec Google
      </Button>
    </main>
  );
}
