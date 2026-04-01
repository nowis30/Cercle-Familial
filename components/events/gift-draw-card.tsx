import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";

type GiftDrawCardProps = {
  title: string;
  drawDate: string;
  recipientName?: string;
};

export function GiftDrawCard({ title, drawDate, recipientName }: GiftDrawCardProps) {
  return (
    <Card>
      <div className="flex items-center justify-between">
        <CardTitle className="font-serif text-lg">{title}</CardTitle>
        <Badge variant={recipientName ? "primary" : "warning"}>{recipientName ? "Resultat pret" : "En attente"}</Badge>
      </div>
      <CardDescription className="mt-1">Pige du {drawDate}</CardDescription>
      {recipientName ? <p className="mt-2 text-sm text-zinc-700">Ta personne a gater: {recipientName}</p> : null}
    </Card>
  );
}
