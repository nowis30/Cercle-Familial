import Link from "next/link";
import { HistoryActionType, HistoryObjectType } from "@prisma/client";
import { formatDistanceToNow, isToday, isYesterday, startOfDay, subDays } from "date-fns";
import { frCA } from "date-fns/locale";
import { redirect } from "next/navigation";

import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const ACTION_SHORT: Record<HistoryActionType, string> = {
  CREATE: "Cree",
  UPDATE: "Modifie",
  DELETE: "Supprime",
  ASSIGN: "Assigne",
};

const ACTION_VERB: Record<HistoryActionType, string> = {
  CREATE: "a cree",
  UPDATE: "a modifie",
  DELETE: "a supprime",
  ASSIGN: "a assigne",
};

const OBJECT_INDEFINITE: Record<HistoryObjectType, string> = {
  EVENT: "un evenement",
  CIRCLE: "un cercle",
  MEMBER: "un membre",
  CONTRIBUTION_ITEM: "un ingredient",
};

const ACTION_BADGE_VARIANT: Record<HistoryActionType, "primary" | "warning" | "danger" | "default"> = {
  CREATE: "primary",
  UPDATE: "warning",
  DELETE: "danger",
  ASSIGN: "default",
};

type RawEntry = {
  id: string;
  actionType: HistoryActionType;
  objectType: HistoryObjectType;
  objectId: string;
  objectLabel: string | null;
  actorDisplayName: string | null;
  circleId: string | null;
  eventId: string | null;
  createdAt: Date;
};

function buildActionSentence(entry: RawEntry): string {
  const actor = entry.actorDisplayName ?? "Quelqu'un";
  const verb = ACTION_VERB[entry.actionType];
  const obj = OBJECT_INDEFINITE[entry.objectType];
  const base = `${actor} ${verb} ${obj}`;
  return entry.objectLabel ? `${base}\u00a0: ${entry.objectLabel}` : base;
}

function buildEntryLink(entry: RawEntry): string | null {
  if (entry.objectType === HistoryObjectType.EVENT && entry.circleId && entry.eventId && entry.actionType !== HistoryActionType.DELETE) {
    return `/cercles/${entry.circleId}/evenements/${entry.eventId}`;
  }
  if (entry.objectType === HistoryObjectType.CIRCLE && entry.circleId && entry.actionType !== HistoryActionType.DELETE) {
    return `/cercles/${entry.circleId}`;
  }
  if (entry.circleId && entry.actionType !== HistoryActionType.DELETE) {
    return `/cercles/${entry.circleId}`;
  }
  return null;
}

type PeriodGroup = { label: string; entries: RawEntry[] };

function groupByPeriod(entries: RawEntry[]): PeriodGroup[] {
  const now = new Date();
  const weekAgo = startOfDay(subDays(now, 7));

  const buckets: Record<string, RawEntry[]> = { today: [], yesterday: [], week: [], older: [] };
  for (const entry of entries) {
    const at = new Date(entry.createdAt);
    if (isToday(at)) buckets.today.push(entry);
    else if (isYesterday(at)) buckets.yesterday.push(entry);
    else if (at >= weekAgo) buckets.week.push(entry);
    else buckets.older.push(entry);
  }

  const groups: PeriodGroup[] = [];
  if (buckets.today.length > 0) groups.push({ label: "Aujourd\u2019hui", entries: buckets.today });
  if (buckets.yesterday.length > 0) groups.push({ label: "Hier", entries: buckets.yesterday });
  if (buckets.week.length > 0) groups.push({ label: "Cette semaine", entries: buckets.week });
  if (buckets.older.length > 0) groups.push({ label: "Plus tot", entries: buckets.older });
  return groups;
}

export default async function HistoriquePage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/connexion");
  }

  const memberships = await prisma.circleMembership.findMany({
    where: { userId: session.user.id },
    select: { circleId: true },
  });
  const circleIds = memberships.map((m) => m.circleId);

  const [entries, circles] = await Promise.all([
    prisma.actionHistory.findMany({
      where: {
        OR: [{ circleId: { in: circleIds } }, { actorUserId: session.user.id }],
      },
      orderBy: { createdAt: "desc" },
      take: 120,
    }),
    prisma.circle.findMany({
      where: { id: { in: circleIds } },
      select: { id: true, name: true },
    }),
  ]);

  const circleNameMap = new Map(circles.map((c) => [c.id, c.name]));
  const groups = groupByPeriod(entries as RawEntry[]);

  return (
    <AppShell title="Historique des actions">
      {entries.length === 0 ? (
        <Card>
          <p className="text-sm text-zinc-600">Aucune action historisee pour l&apos;instant.</p>
        </Card>
      ) : (
        <div className="space-y-5">
          {groups.map((group) => (
            <div key={group.label}>
              <p className="mb-2 px-1 text-xs font-bold uppercase tracking-wide text-zinc-400">{group.label}</p>
              <div className="space-y-2">
                {group.entries.map((entry) => {
                  const link = buildEntryLink(entry);
                  const circleName = entry.circleId ? circleNameMap.get(entry.circleId) : null;
                  const sentence = buildActionSentence(entry);
                  const relativeTime = formatDistanceToNow(new Date(entry.createdAt), { locale: frCA, addSuffix: true });

                  const inner = (
                    <Card className={`space-y-1 ${link ? "transition-all hover:border-indigo-200 hover:shadow-md" : ""}`}>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={ACTION_BADGE_VARIANT[entry.actionType]}>{ACTION_SHORT[entry.actionType]}</Badge>
                        {circleName ? <span className="text-xs font-medium text-zinc-500">{circleName}</span> : null}
                      </div>
                      <p className="text-sm font-semibold text-zinc-900">{sentence}</p>
                      <p className="text-xs text-zinc-400">{relativeTime}</p>
                    </Card>
                  );

                  if (link) {
                    return (
                      <Link key={entry.id} href={link} className="block">
                        {inner}
                      </Link>
                    );
                  }
                  return <div key={entry.id}>{inner}</div>;
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </AppShell>
  );
}
