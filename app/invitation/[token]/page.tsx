import Link from "next/link";
import { redirect } from "next/navigation";

import { joinCircleWithTokenAction } from "@/actions/invites";
import { auth } from "@/lib/auth";

export default async function InvitationPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const session = await auth();

  if (!session?.user?.id) {
    redirect(`/connexion?callbackUrl=/invitation/${token}`);
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-xl bg-zinc-50 px-4 py-8">
      <h1 className="text-2xl font-semibold">Invitation de cercle</h1>
      <p className="mt-1 text-sm text-zinc-600">Acceptez ce lien pour rejoindre le cercle familial.</p>
      <form
        className="mt-6 space-y-3 rounded-2xl border border-zinc-200 bg-white p-4"
        action={async () => {
          "use server";
          const result = await joinCircleWithTokenAction({ token });
          if (!result.success) {
            redirect(`/cercles?error=${encodeURIComponent(result.message ?? "Invitation invalide")}`);
          }
          redirect(`/cercles/${result.circleId}`);
        }}
      >
        <button type="submit" className="w-full rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white">
          Rejoindre le cercle
        </button>
      </form>
      <Link href="/cercles" className="mt-3 inline-block text-sm text-zinc-600 underline">
        Retour a mes cercles
      </Link>
    </main>
  );
}
