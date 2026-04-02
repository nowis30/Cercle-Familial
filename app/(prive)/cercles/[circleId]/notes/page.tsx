import Link from "next/link";
import { CircleRole } from "@prisma/client";
import { redirect } from "next/navigation";

import { SharedNotesBoard } from "@/components/notes/shared-notes-board";
import { AppShell } from "@/components/layout/app-shell";
import { auth } from "@/lib/auth";
import { canManageCircle } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

function canCreateSharedNote(role: CircleRole) {
  return role === CircleRole.ADMIN || role === CircleRole.ADULTE;
}

export default async function CircleNotesPage({ params }: { params: Promise<{ circleId: string }> }) {
  const { circleId } = await params;
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/connexion");
  }

  const membership = await prisma.circleMembership.findUnique({
    where: {
      circleId_userId: {
        circleId,
        userId: session.user.id,
      },
    },
    include: {
      circle: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  if (!membership) {
    redirect("/cercles");
  }

  const notes = await prisma.sharedNote.findMany({
    where: {
      circleId,
      eventId: null,
    },
    include: {
      createdBy: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: [{ isPinned: "desc" }, { updatedAt: "desc" }],
    take: 100,
  });

  const isAdmin = canManageCircle(membership.role);
  const currentUserId = session.user.id;

  return (
    <AppShell title={`Notes: ${membership.circle.name}`}>
      <div className="flex flex-wrap gap-2">
        <Link
          href={`/cercles/${circleId}`}
          className="inline-flex rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-700 transition-colors hover:bg-zinc-50"
        >
          Retour au cercle
        </Link>
      </div>

      <SharedNotesBoard
        circleId={circleId}
        canCreateNotes={canCreateSharedNote(membership.role)}
        notes={notes.map((note) => ({
          id: note.id,
          title: note.title,
          content: note.content,
          isPinned: note.isPinned,
          createdByName: note.createdBy.name,
          createdAtLabel: new Intl.DateTimeFormat("fr-CA", {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          }).format(note.createdAt),
          canManage: isAdmin || note.createdById === currentUserId,
        }))}
        contextLabel="ce cercle"
      />
    </AppShell>
  );
}
