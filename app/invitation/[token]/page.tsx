import Link from "next/link";
import { redirect } from "next/navigation";

import { joinCircleWithTokenAction } from "@/actions/invites";
import { Card } from "@/components/ui/card";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function InvitationPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { token } = await params;
  const { error } = await searchParams;
  const session = await auth();

  const invite = await prisma.circleInvite.findUnique({
    where: { token },
    include: {
      circle: {
        select: {
          id: true,
          name: true,
          description: true,
        },
      },
      createdBy: {
        select: {
          name: true,
        },
      },
    },
  });

  const inviteIsExpired = invite ? invite.expiresAt < new Date() || invite.usedCount >= invite.maxUses : false;
  const inviteIsInvalid = !invite || inviteIsExpired;
  const callbackUrl = `/invitation/${token}`;

  const existingMembership = session?.user?.id && invite
    ? await prisma.circleMembership.findUnique({
        where: {
          circleId_userId: {
            circleId: invite.circleId,
            userId: session.user.id,
          },
        },
      })
    : null;

  return (
    <main className="mx-auto min-h-screen w-full max-w-xl px-4 py-8">
      <Card className="bg-gradient-to-br from-white to-indigo-50/60">
        <h1 className="font-serif text-2xl font-bold text-zinc-900">Invitation de cercle</h1>
        {inviteIsInvalid ? (
          <p className="mt-1 text-sm text-rose-700">Lien d&apos;invitation invalide ou expire.</p>
        ) : (
          <>
            <p className="mt-1 text-sm text-zinc-600">Vous etes invite a rejoindre ce cercle familial.</p>
            <p className="mt-2 text-sm font-semibold text-zinc-900">Cercle: {invite.circle.name}</p>
            {invite.circle.description ? <p className="mt-1 text-xs text-zinc-600">{invite.circle.description}</p> : null}
            <p className="mt-1 text-xs text-zinc-500">Invite par: {invite.createdBy?.name ?? "Un membre du cercle"}</p>
          </>
        )}
      </Card>

      {!session?.user?.id ? (
        <Card className="mt-4">
          <p className="text-sm text-zinc-700">Connectez-vous ou creez un compte pour continuer avec cette invitation.</p>
          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
            <Link href={`/connexion?callbackUrl=${encodeURIComponent(callbackUrl)}`} className="inline-flex h-10 items-center justify-center rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white hover:bg-indigo-500">
              Se connecter
            </Link>
            <Link href={`/inscription?callbackUrl=${encodeURIComponent(callbackUrl)}`} className="inline-flex h-10 items-center justify-center rounded-xl border border-zinc-200 bg-white px-4 text-sm font-semibold text-zinc-700 hover:bg-zinc-50">
              Creer un compte
            </Link>
          </div>
        </Card>
      ) : null}

      {session?.user?.id && inviteIsInvalid ? (
        <Card className="mt-4">
          <p className="text-sm text-zinc-700">Ce lien ne peut plus etre utilise. Demandez une nouvelle invitation.</p>
          <Link href="/cercles" className="mt-3 inline-flex h-10 items-center justify-center rounded-xl border border-zinc-200 bg-white px-4 text-sm font-semibold text-zinc-700 hover:bg-zinc-50">
            Retour a mes cercles
          </Link>
        </Card>
      ) : null}

      {session?.user?.id && invite && existingMembership ? (
        <Card className="mt-4">
          <p className="text-sm font-semibold text-emerald-700">Vous faites deja partie de ce cercle.</p>
          <Link href={`/cercles/${invite.circleId}`} className="mt-3 inline-flex h-10 items-center justify-center rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white hover:bg-indigo-500">
            Ouvrir le cercle
          </Link>
        </Card>
      ) : null}

      {session?.user?.id && invite && !existingMembership && !inviteIsInvalid ? (
        <form
          className="mt-4 space-y-3 rounded-3xl border border-indigo-100 bg-white p-4"
          action={async () => {
            "use server";
            const result = await joinCircleWithTokenAction({ token });
            if (!result.success) {
              redirect(`/invitation/${token}?error=${encodeURIComponent(result.message ?? "Invitation invalide")}`);
            }
            redirect(`/cercles/${result.circleId}`);
          }}
        >
          <button type="submit" className="w-full rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-indigo-200 transition-colors hover:bg-indigo-500">
            Rejoindre le cercle
          </button>
        </form>
      ) : null}

      {error ? <p className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">{error}</p> : null}
    </main>
  );
}
