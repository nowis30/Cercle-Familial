import Link from "next/link";

import { GiftDrawCard } from "@/components/events/gift-draw-card";
import { AppShell } from "@/components/layout/app-shell";

export default async function CadeauxPage({ params }: { params: Promise<{ circleId: string }> }) {
  const { circleId } = await params;

  return (
    <AppShell title="Pige de cadeaux">
      <GiftDrawCard title="Pige de Noel 2026" drawDate="20 novembre 2026" recipientName="Leo Gagnon" />
      <Link href={`/cercles/${circleId}/cadeaux/draw-1`} className="rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm">
        Ouvrir le detail de la pige
      </Link>
    </AppShell>
  );
}
