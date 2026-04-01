import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { EVENT_TYPE_LABELS } from "@/lib/constants";

type EventCardProps = {
  circleId: string;
  event: {
    id: string;
    title: string;
    type: string;
    startsAt: string;
    locationName: string;
    missingResponses?: number;
  };
};

export function EventCard({ circleId, event }: EventCardProps) {
  return (
    <Link href={`/cercles/${circleId}/evenements/${event.id}`}>
      <Card className="active:scale-[0.99]">
        <div className="flex items-center justify-between gap-3">
          <CardTitle>{event.title}</CardTitle>
          <Badge variant="info">{EVENT_TYPE_LABELS[event.type] ?? event.type}</Badge>
        </div>
        <CardDescription className="mt-2">{event.startsAt}</CardDescription>
        <p className="mt-1 text-sm text-zinc-700">{event.locationName}</p>
        {typeof event.missingResponses === "number" ? (
          <p className="mt-2 text-xs text-amber-700">Reponses manquantes: {event.missingResponses}</p>
        ) : null}
      </Card>
    </Link>
  );
}
