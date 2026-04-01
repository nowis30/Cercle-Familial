import { redirect } from "next/navigation";

import { CreateCircleForm } from "@/components/circles/create-circle-form";
import { AppShell } from "@/components/layout/app-shell";
import { Card } from "@/components/ui/card";
import { auth } from "@/lib/auth";

export default async function NouveauCerclePage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/connexion");
  }

  return (
    <AppShell title="Nouveau cercle">
      <Card className="bg-gradient-to-br from-white to-indigo-50/60">
        <p className="font-serif text-lg font-bold text-zinc-900">Creer un cercle</p>
        <p className="mt-1 text-sm text-zinc-600">Ajoutez un nom, une description et vos regles de base pour lancer un nouvel espace familial.</p>
      </Card>
      <CreateCircleForm />
    </AppShell>
  );
}
