import Link from "next/link";
import { CircleRole, SharedTaskStatus } from "@prisma/client";
import { redirect } from "next/navigation";

import { AppShell } from "@/components/layout/app-shell";
import { SharedTasksBoard } from "@/components/tasks/shared-tasks-board";
import { auth } from "@/lib/auth";
import { canManageCircle } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

function canCreateSharedTask(role: CircleRole) {
  return role === CircleRole.ADMIN || role === CircleRole.ADULTE;
}

function toDateInputValue(date: Date | null) {
  if (!date) return null;
  return date.toISOString().slice(0, 10);
}

export default async function CircleSharedTasksPage({ params }: { params: Promise<{ circleId: string }> }) {
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

  const [members, tasks] = await Promise.all([
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
    prisma.sharedTask.findMany({
      where: { circleId },
      include: {
        createdBy: {
          select: { id: true, name: true },
        },
        assignee: {
          select: { id: true, name: true },
        },
      },
      orderBy: [{ status: "asc" }, { priority: "desc" }, { dueAt: "asc" }, { createdAt: "desc" }],
    }),
  ]);

  const isAdmin = canManageCircle(membership.role);
  const currentUserId = session.user.id;

  const mappedTasks = tasks.map((task) => ({
    id: task.id,
    title: task.title,
    note: task.note,
    dueAt: toDateInputValue(task.dueAt),
    status: task.status,
    priority: task.priority,
    createdByName: task.createdBy.name,
    assigneeUserId: task.assigneeUserId,
    assigneeName: task.assignee?.name ?? null,
    canManage: isAdmin || task.createdById === currentUserId,
    canUpdateStatus: isAdmin || task.createdById === currentUserId || task.assigneeUserId === currentUserId,
  }));

  const activeTasks = mappedTasks.filter((task) => task.status !== SharedTaskStatus.TERMINE);
  const completedTasks = mappedTasks.filter((task) => task.status === SharedTaskStatus.TERMINE);

  return (
    <AppShell title={`Taches: ${membership.circle.name}`}>
      <div className="flex flex-wrap gap-2">
        <Link
          href={`/cercles/${circleId}`}
          className="inline-flex rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-700 transition-colors hover:bg-zinc-50"
        >
          Retour au cercle
        </Link>
        <Link
          href={`/cercles/${circleId}/listes`}
          className="inline-flex rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-700 transition-colors hover:bg-indigo-100"
        >
          Voir les listes
        </Link>
      </div>

      <SharedTasksBoard
        circleId={circleId}
        canCreateTasks={canCreateSharedTask(membership.role)}
        members={members.map((member) => ({
          id: member.user.id,
          name: member.user.name,
          role: member.role,
        }))}
        activeTasks={activeTasks}
        completedTasks={completedTasks}
      />
    </AppShell>
  );
}