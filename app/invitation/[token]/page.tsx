import Link from "next/link";
import { redirect } from "next/navigation";

import { joinCircleWithTokenAction } from "@/actions/invites";
import { Card } from "@/components/ui/card";
import { auth } from "@/lib/auth";

export default async function InvitationPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const session = await auth();

  if (!session?.user?.id) {
    redirect(`/connexion?callbackUrl=/invitation/${token}`);
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-xl px-4 py-8">
      <Card className="bg-gradient-to-br from-white to-indigo-50/60">
        <h1 className="font-serif text-2xl font-bold text-zinc-900">Invitation de cercle</h1>
        <p className="mt-1 text-sm text-zinc-600">Acceptez ce lien pour rejoindre le cercle familial.</p>
      </Card>
      <form
        className="mt-4 space-y-3 rounded-3xl border border-indigo-100 bg-white p-4"
        action={async () => {
          "use server";
          const result = await joinCircleWithTokenAction({ token });
          if (!result.success) {
            redirect(`/cercles?error=${encodeURIComponent(result.message ?? "Invitation invalide")}`);
          }
          redirect(`/cercles/${result.circleId}`);
        }}
      >
        <button type="submit" className="w-full rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-indigo-200 transition-colors hover:bg-indigo-500">
          Rejoindre le cercle
        </button>
      </form>
      <Link href="/cercles" className="mt-3 inline-block text-sm font-semibold text-zinc-600 underline">
        Retour a mes cercles
      </Link>
    </main>
  );
}
