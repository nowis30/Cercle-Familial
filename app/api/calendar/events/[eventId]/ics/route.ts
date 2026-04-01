import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { buildIcsContent, buildIcsFilename } from "@/lib/event-calendar";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ eventId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Session invalide." }, { status: 401 });
  }

  const { eventId } = await params;

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: {
      id: true,
      title: true,
      description: true,
      locationName: true,
      address: true,
      startsAt: true,
      endsAt: true,
      circleId: true,
    },
  });

  if (!event) {
    return NextResponse.json({ error: "Evenement introuvable." }, { status: 404 });
  }

  const membership = await prisma.circleMembership.findUnique({
    where: {
      circleId_userId: {
        circleId: event.circleId,
        userId: session.user.id,
      },
    },
  });

  if (!membership) {
    return NextResponse.json({ error: "Acces refuse." }, { status: 403 });
  }

  const icsContent = buildIcsContent({
    id: event.id,
    title: event.title,
    description: event.description,
    locationName: event.locationName,
    address: event.address,
    startsAt: new Date(event.startsAt),
    endsAt: event.endsAt ? new Date(event.endsAt) : null,
  });

  const filename = buildIcsFilename({
    id: event.id,
    title: event.title,
    description: event.description,
    locationName: event.locationName,
    address: event.address,
    startsAt: new Date(event.startsAt),
    endsAt: event.endsAt ? new Date(event.endsAt) : null,
  });

  return new NextResponse(icsContent, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename=\"${filename}\"`,
      "Cache-Control": "private, no-store",
    },
  });
}
