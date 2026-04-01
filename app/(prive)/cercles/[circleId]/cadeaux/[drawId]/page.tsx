import { AppShell } from "@/components/layout/app-shell";
import { GiftDrawCard } from "@/components/events/gift-draw-card";
import { Card } from "@/components/ui/card";

export default async function CadeauDetailPage() {
  return (
    <AppShell title="Detail de la pige">
      <GiftDrawCard title="Pige de Noel 2026" drawDate="20 novembre 2026" recipientName="Leo Gagnon" />
      <Card>
        <p className="text-sm text-zinc-600">Regle V1: les parents peuvent piger leurs enfants. La logique est isolee pour ajustements V2.</p>
      </Card>
    </AppShell>
  );
}
