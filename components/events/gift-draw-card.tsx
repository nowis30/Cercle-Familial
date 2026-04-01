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
        <CardTitle>{title}</CardTitle>
        <Badge>{recipientName ? "Resultat pret" : "En attente"}</Badge>
      </div>
      <CardDescription className="mt-1">Pige du {drawDate}</CardDescription>
      {recipientName ? <p className="mt-2 text-sm">Ta personne a gâter: {recipientName}</p> : null}
    </Card>
  );
}
