import { HistoryActionType, HistoryObjectType } from "@prisma/client";
import { redirect } from "next/navigation";

import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const ACTION_LABEL: Record<HistoryActionType, string> = {
  CREATE: "Creation",
  UPDATE: "Modification",
  DELETE: "Suppression",
  ASSIGN: "Assignation",
};

const OBJECT_LABEL: Record<HistoryObjectType, string> = {
  EVENT: "Evenement",
  CIRCLE: "Cercle",
  MEMBER: "Membre",
  CONTRIBUTION_ITEM: "Ingredient",
};

export default async function HistoriquePage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/connexion");
  }

  const memberships = await prisma.circleMembership.findMany({
    where: { userId: session.user.id },
    select: { circleId: true },
  });
  const circleIds = memberships.map((membership) => membership.circleId);

  const entries = await prisma.actionHistory.findMany({
    where: {
      OR: [{ circleId: { in: circleIds } }, { actorUserId: session.user.id }],
    },
    orderBy: { createdAt: "desc" },
    take: 120,
  });

  return (
    <AppShell title="Historique des actions">
      {entries.length === 0 ? (
        <Card>
          <p className="text-sm text-zinc-600">Aucune action historisee pour l&apos;instant.</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {entries.map((entry) => (
            <Card key={entry.id} className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={entry.actionType === "DELETE" ? "danger" : entry.actionType === "UPDATE" ? "warning" : "primary"}>
                  {ACTION_LABEL[entry.actionType]}
                </Badge>
                <Badge variant="secondary">{OBJECT_LABEL[entry.objectType]}</Badge>
              </div>

              <p className="text-sm font-semibold text-zinc-900">{entry.objectLabel ?? entry.objectId}</p>
              <p className="text-xs text-zinc-600">
                Par {entry.actorDisplayName ?? entry.actorUserId} - {new Date(entry.createdAt).toLocaleString("fr-CA")}
              </p>

              {entry.details ? (
                <pre className="overflow-x-auto rounded-xl bg-zinc-50 px-3 py-2 text-[11px] text-zinc-700">
                  {JSON.stringify(entry.details, null, 2)}
                </pre>
              ) : null}
            </Card>
          ))}
        </div>
      )}
    </AppShell>
  );
}
