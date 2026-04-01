import Link from "next/link";

import { APP_NAME } from "@/lib/constants";

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-xl flex-col justify-center bg-gradient-to-b from-emerald-50 via-white to-white px-6 py-10">
      <p className="text-sm font-medium uppercase tracking-wide text-emerald-700">Application familiale privee</p>
      <h1 className="mt-3 text-4xl font-semibold leading-tight text-zinc-900">{APP_NAME}</h1>
      <p className="mt-4 text-zinc-600">
        Organisez anniversaires, fetes, RSVP, contributions, discussions et souvenirs photo dans un espace simple et securise.
      </p>
      <div className="mt-8 flex gap-3">
        <Link href="/connexion" className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-medium text-white">
          Se connecter
        </Link>
        <Link href="/inscription" className="rounded-xl border border-zinc-300 px-5 py-3 text-sm font-medium text-zinc-700">
          Creer un compte
        </Link>
      </div>
    </main>
  );
}
