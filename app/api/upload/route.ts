import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { MAX_PHOTO_BYTES, matchesPhotoMime, readPhotoFormData } from "@/lib/event-photo-reference";
import { deleteEventPhotoFile, saveEventPhoto } from "@/lib/event-photo-storage";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Session invalide", code: "INVALID_SESSION" }, { status: 401 });
    }
    if (request.headers.get("origin") !== new URL(request.url).origin) {
      return NextResponse.json({ error: "Origine refusee", code: "INVALID_ORIGIN" }, { status: 403 });
    }

    const formData = await readPhotoFormData(request);
    const file = formData.get("file");
    const eventId = formData.get("eventId");
    const caption = formData.get("caption");
    if (!(file instanceof File) || typeof eventId !== "string" || !eventId || eventId.length > 128 ||
      (caption !== null && (typeof caption !== "string" || caption.length > 1000))) {
      return NextResponse.json({ error: "Photo ou evenement invalide", code: "INVALID_FILE" }, { status: 400 });
    }
    if (!file.size || file.size > MAX_PHOTO_BYTES) {
      return NextResponse.json({ error: "Fichier trop volumineux ou vide (max 20 Mo)", code: "FILE_TOO_LARGE" }, { status: 413 });
    }
    const event = await prisma.event.findFirst({
      where: { id: eventId, circle: { memberships: { some: { userId: session.user.id } } } },
      select: { id: true, circleId: true },
    });
    if (!event) return NextResponse.json({ error: "Evenement inaccessible", code: "PERMISSION_DENIED" }, { status: 403 });

    const bytes = Buffer.from(await file.arrayBuffer());
    if (!matchesPhotoMime(bytes, file.type)) {
      return NextResponse.json({ error: "Type de fichier non autorise (jpg, png, webp, gif)", code: "INVALID_MIME_TYPE" }, { status: 400 });
    }
    const reference = await saveEventPhoto(bytes, file.type);
    let photo: { id: string };
    try {
      // Registration and ownership are server-side: the client never submits a storage URL.
      photo = await prisma.eventPhoto.create({
        data: { eventId: event.id, uploadedBy: session.user.id, url: reference, caption: typeof caption === "string" ? caption.trim() || null : null },
        select: { id: true },
      });
    } catch (error) {
      await deleteEventPhotoFile(reference).catch(() => console.error("[upload] Nettoyage du fichier orphelin requis"));
      throw error;
    }
    revalidatePath(`/cercles/${event.circleId}/evenements/${event.id}`);
    return NextResponse.json({ id: photo.id, url: `/api/photos/${encodeURIComponent(photo.id)}` }, { status: 201 });
  } catch (error) {
    if (error instanceof RangeError) return NextResponse.json({ error: "Fichier trop volumineux", code: "FILE_TOO_LARGE" }, { status: 413 });
    if (error instanceof TypeError) return NextResponse.json({ error: "Formulaire invalide", code: "INVALID_FILE" }, { status: 400 });
    // Do not log provider errors: they may contain private storage URLs or credentials.
    console.error("[upload] Echec du stockage ou de l'enregistrement de la photo");
    return NextResponse.json({ error: "Televersement indisponible. Reessayez plus tard.", code: "UPLOAD_WRITE_FAILED" }, { status: 503 });
  }
}
