"use client";

import Link from "next/link";
import { Bell, CheckCheck, RefreshCcw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  markAllNotificationsReadAction,
  markNotificationReadAction,
  refreshNotificationsAction,
} from "@/actions/notifications";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";

type NotificationView = {
  id: string;
  title: string;
  message: string;
  href: string | null;
  isRead: boolean;
  createdAtLabel: string;
};

export function NotificationsCenter({
  unreadCount,
  notifications,
}: {
  unreadCount: number;
  notifications: NotificationView[];
}) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  async function runAction(task: () => Promise<{ success: boolean; message?: string }>, successMessage: string) {
    setIsLoading(true);
    const result = await task();
    setIsLoading(false);

    if (!result.success) {
      setFeedback(result.message ?? "Operation impossible.");
      return;
    }

    setFeedback(successMessage);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <Card className="space-y-3 bg-gradient-to-br from-white to-sky-50/60">
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle className="font-serif text-lg">Centre de notifications</CardTitle>
            <CardDescription className="mt-1">Rappels utiles: anniversaires, evenements, RSVP, urgences et taches en retard.</CardDescription>
          </div>
          <Badge variant={unreadCount > 0 ? "danger" : "secondary"}>{unreadCount} non lue(s)</Badge>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={isLoading}
            onClick={() => runAction(refreshNotificationsAction, "Rappels actualises.")}
          >
            <RefreshCcw className="mr-1 h-4 w-4" />
            Actualiser
          </Button>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={isLoading || unreadCount === 0}
            onClick={() => runAction(markAllNotificationsReadAction, "Toutes les notifications sont marquees lues.")}
          >
            <CheckCheck className="mr-1 h-4 w-4" />
            Tout marquer lu
          </Button>
        </div>

        {feedback ? <p className="rounded-xl bg-sky-50 px-3 py-2 text-xs font-semibold text-sky-700">{feedback}</p> : null}
      </Card>

      {notifications.length === 0 ? (
        <Card>
          <p className="text-sm text-zinc-600">Aucune notification pour le moment.</p>
        </Card>
      ) : null}

      {notifications.map((item) => (
        <Card key={item.id} className={`${item.isRead ? "opacity-85" : "border-sky-200 bg-sky-50/40"}`}>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-zinc-900">{item.title}</p>
              <p className="mt-1 text-sm text-zinc-700">{item.message}</p>
              <p className="mt-1 text-xs text-zinc-500">{item.createdAtLabel}</p>
            </div>
            {!item.isRead ? <Bell className="h-4 w-4 shrink-0 text-sky-600" /> : null}
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {item.href ? (
              <Link href={item.href} className="inline-flex h-8 items-center rounded-lg border border-sky-200 bg-white px-3 text-xs font-semibold text-sky-700 hover:bg-sky-50">
                Ouvrir
              </Link>
            ) : null}
            {!item.isRead ? (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={isLoading}
                onClick={() => runAction(() => markNotificationReadAction({ notificationId: item.id }), "Notification marquee lue.")}
              >
                Marquer lue
              </Button>
            ) : null}
          </div>
        </Card>
      ))}
    </div>
  );
}
