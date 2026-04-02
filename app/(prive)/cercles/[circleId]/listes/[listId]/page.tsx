import Link from "next/link";
import { CircleRole } from "@prisma/client";
import { redirect } from "next/navigation";

import { SharedListsBoard } from "@/components/lists/shared-lists-board";
import { AppShell } from "@/components/layout/app-shell";
import { auth } from "@/lib/auth";
import { canManageCircle } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

function canCreateSharedList(role: CircleRole) {
  return role === CircleRole.ADMIN || role === CircleRole.ADULTE;
}

export default async function CircleSharedListDetailPage({ params }: { params: Promise<{ circleId: string; listId: string }> }) {
  const { circleId, listId } = await params;
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

  const [members, list] = await Promise.all([
    prisma.circleMembership.findMany({
      where: { circleId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: "asc",
      },
    }),
    prisma.sharedList.findFirst({
      where: { id: listId, circleId },
      include: {
        createdBy: {
          select: { id: true, name: true },
        },
        items: {
          include: {
            assignee: {
              select: { id: true, name: true },
            },
            checkedBy: {
              select: { id: true, name: true },
            },
          },
          orderBy: [{ isChecked: "asc" }, { position: "asc" }, { createdAt: "asc" }],
        },
      },
    }),
  ]);

  if (!list) {
    redirect(`/cercles/${circleId}/listes`);
  }

  const isAdmin = canManageCircle(membership.role);
  const currentUserId = session.user.id;
  const listCanManage = isAdmin || list.createdById === currentUserId;

  const mappedList = {
    id: list.id,
    title: list.title,
    note: list.note,
    type: list.type,
    isArchived: list.isArchived,
    createdById: list.createdById,
    createdByName: list.createdBy.name,
    canManage: listCanManage,
    items: list.items.map((item) => ({
      id: item.id,
      label: item.label,
      quantity: item.quantity,
      comment: item.comment,
      isChecked: item.isChecked,
      createdById: item.createdById,
      assigneeUserId: item.assigneeUserId,
      assigneeName: item.assignee?.name ?? null,
      checkedByName: item.checkedBy?.name ?? null,
      canManage: listCanManage || item.createdById === currentUserId,
    })),
  };

  return (
    <AppShell title={`Liste: ${list.title}`}>
      <div className="flex flex-wrap gap-2">
        <Link
          href={`/cercles/${circleId}/listes`}
          className="inline-flex rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-700 transition-colors hover:bg-zinc-50"
        >
          Retour aux listes
        </Link>
        <Link
          href={`/cercles/${circleId}`}
          className="inline-flex rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-700 transition-colors hover:bg-indigo-100"
        >
          Retour au cercle
        </Link>
      </div>

      <SharedListsBoard
        circleId={circleId}
        canCreateLists={canCreateSharedList(membership.role)}
        members={members.map((member) => ({
          id: member.user.id,
          name: member.user.name,
          role: member.role,
        }))}
        activeLists={list.isArchived ? [] : [mappedList]}
        archivedLists={list.isArchived ? [mappedList] : []}
        hideCreateSection
      />
    </AppShell>
  );
}