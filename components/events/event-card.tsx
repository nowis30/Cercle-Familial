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
    endsAt?: string;
    locationName: string;
    missingResponses?: number;
  };
};

export function EventCard({ circleId, event }: EventCardProps) {
  return (
    <Link href={`/cercles/${circleId}/evenements/${event.id}`}>
      <Card className="transition-shadow hover:shadow-[0_14px_26px_-20px_rgba(30,64,175,0.45)]">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="line-clamp-1 font-serif text-lg">{event.title}</CardTitle>
          <Badge variant="primary">{EVENT_TYPE_LABELS[event.type] ?? event.type}</Badge>
        </div>
        <CardDescription className="mt-2 text-zinc-600">{event.endsAt ? `${event.startsAt} - ${event.endsAt}` : `${event.startsAt} - fin non definie`}</CardDescription>
        <p className="mt-1 text-sm font-medium text-zinc-700">{event.locationName}</p>
        {typeof event.missingResponses === "number" ? (
          <p className="mt-2 inline-flex rounded-full bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-800">Reponses manquantes: {event.missingResponses}</p>
        ) : null}
      </Card>
    </Link>
  );
}
