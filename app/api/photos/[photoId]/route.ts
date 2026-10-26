import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { readEventPhoto } from "@/lib/event-photo-storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const privateHeaders = { "Cache-Control": "private, no-store", "Vary": "Cookie", "X-Content-Type-Options": "nosniff" };

export async function GET(_request: Request, { params }: { params: Promise<{ photoId: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return new Response(null, { status: 401, headers: privateHeaders });
  const { photoId } = await params;
  const photo = await prisma.eventPhoto.findFirst({
    where: { id: photoId, event: { circle: { memberships: { some: { userId: session.user.id } } } } },
  });
  if (!photo) return new Response(null, { status: 404, headers: privateHeaders });
  try {
    const file = await readEventPhoto(photo.url);
    if (!file) return new Response(null, { status: 404, headers: privateHeaders });
    return new Response(file.body, { headers: { ...privateHeaders, "Content-Type": file.contentType } });
  } catch {
    return new Response(null, { status: 503, headers: privateHeaders });
  }
}
