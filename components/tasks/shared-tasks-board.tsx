"use client";

import { CircleRole, SharedTaskPriority, SharedTaskStatus } from "@prisma/client";
import { AlertCircle, CalendarDays, CheckCircle2, Pencil, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";

import {
  createSharedTaskAction,
  deleteSharedTaskAction,
  setSharedTaskStatusAction,
  updateSharedTaskAction,
} from "@/actions/tasks";
import { ConfirmDestructiveDialog } from "@/components/shared/confirm-destructive-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SHARED_TASK_PRIORITY_LABELS, SHARED_TASK_STATUS_LABELS } from "@/lib/constants";

type MemberOption = {
  id: string;
  name: string;
  role: CircleRole;
};

type SharedTaskView = {
  id: string;
  title: string;
  note: string | null;
  dueAt: string | null;
  status: SharedTaskStatus;
  priority: SharedTaskPriority;
  createdByName: string;
  assigneeUserId: string | null;
  assigneeName: string | null;
  canManage: boolean;
  canUpdateStatus: boolean;
};

type SharedTasksBoardProps = {
  circleId: string;
  canCreateTasks: boolean;
  members: MemberOption[];
  activeTasks: SharedTaskView[];
  completedTasks: SharedTaskView[];
};

type TaskEditState = {
  taskId: string;
  title: string;
  note: string;
  dueAt: string;
  priority: SharedTaskPriority;
  status: SharedTaskStatus;
  assigneeUserId: string;
};

const priorityTone: Record<SharedTaskPriority, "secondary" | "warning" | "danger"> = {
  NORMALE: "secondary",
  IMPORTANTE: "warning",
  URGENTE: "danger",
};

const statusTone: Record<SharedTaskStatus, "secondary" | "info" | "default"> = {
  A_FAIRE: "secondary",
  EN_COURS: "info",
  TERMINE: "default",
};

function formatDueDate(value: string | null) {
  if (!value) return null;
  return new Date(value).toLocaleDateString("fr-CA", { month: "short", day: "numeric" });
}

export function SharedTasksBoard({ circleId, canCreateTasks, members, activeTasks, completedTasks }: SharedTasksBoardProps) {
  const router = useRouter();
  const [feedback, setFeedback] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [priority, setPriority] = useState<SharedTaskPriority>(SharedTaskPriority.NORMALE);
  const [assigneeUserId, setAssigneeUserId] = useState("");
  const [editingTask, setEditingTask] = useState<TaskEditState | null>(null);

  const memberOptions = useMemo(
    () => [...members].sort((a, b) => a.name.localeCompare(b.name, "fr-CA", { sensitivity: "base" })),
    [members],
  );

  function setSuccess(text: string) {
    setFeedback({ tone: "success", text });
  }

  function setError(text: string) {
    setFeedback({ tone: "error", text });
  }

  async function refreshAfterAction(successMessage?: string) {
    router.refresh();
    if (successMessage) {
      setSuccess(successMessage);
    }
  }

  async function onCreateTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canCreateTasks) {
      setError("Seuls les adultes et admins peuvent creer une tache.");
      return;
    }

    setIsSubmitting(true);
    const result = await createSharedTaskAction({
      circleId,
      title,
      note,
      dueAt,
      priority,
      assigneeUserId: assigneeUserId || undefined,
    });
    setIsSubmitting(false);

    if (!result.success) {
      setError(result.message ?? "Creation impossible.");
      return;
    }

    setTitle("");
    setNote("");
    setDueAt("");
    setPriority(SharedTaskPriority.NORMALE);
    setAssigneeUserId("");
    await refreshAfterAction("Tache creee.");
  }

  return (
    <div className="space-y-4">
      <Card className="space-y-3 bg-gradient-to-br from-white to-amber-50/60">
        <CardTitle className="font-serif text-lg">Taches partagees</CardTitle>
        <CardDescription>Des taches simples, lisibles et assignables pour ne rien oublier.</CardDescription>

        <form className="space-y-2" onSubmit={onCreateTask}>
          <Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Titre de la tache" disabled={!canCreateTasks || isSubmitting} />
          <Textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Note courte (facultative)"
            disabled={!canCreateTasks || isSubmitting}
            className="min-h-20"
          />
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <Input type="date" value={dueAt} onChange={(event) => setDueAt(event.target.value)} disabled={!canCreateTasks || isSubmitting} />
            <select
              value={priority}
              onChange={(event) => setPriority(event.target.value as SharedTaskPriority)}
              disabled={!canCreateTasks || isSubmitting}
              className="h-11 w-full rounded-xl border border-amber-100 bg-white px-3 text-sm text-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
            >
              {Object.values(SharedTaskPriority).map((priorityValue) => (
                <option key={priorityValue} value={priorityValue}>
                  {SHARED_TASK_PRIORITY_LABELS[priorityValue]}
                </option>
              ))}
            </select>
          </div>
          <select
            value={assigneeUserId}
            onChange={(event) => setAssigneeUserId(event.target.value)}
            disabled={!canCreateTasks || isSubmitting}
            className="h-11 w-full rounded-xl border border-amber-100 bg-white px-3 text-sm text-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
          >
            <option value="">Personne en particulier</option>
            {memberOptions.map((member) => (
              <option key={member.id} value={member.id}>
                {member.name}
              </option>
            ))}
          </select>
          <Button type="submit" className="h-11 w-full" disabled={!canCreateTasks || isSubmitting}>
            <Plus className="mr-1 h-4 w-4" />
            Ajouter la tache
          </Button>
        </form>

        {feedback ? (
          <p className={`rounded-xl px-3 py-2 text-xs font-semibold ${feedback.tone === "success" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
            {feedback.text}
          </p>
        ) : null}
      </Card>

      <Card className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="font-serif text-lg">A faire maintenant</CardTitle>
          <Badge variant="warning">{activeTasks.length} actives</Badge>
        </div>

        {activeTasks.length === 0 ? <p className="text-sm text-zinc-600">Aucune tache active pour ce cercle.</p> : null}

        <div className="space-y-2">
          {activeTasks.map((task) => (
            <div key={task.id} className="rounded-2xl border border-zinc-200/80 bg-white p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-base font-semibold text-zinc-900">{task.title}</p>
                  <div className="mt-1 flex flex-wrap gap-2">
                    <Badge variant={statusTone[task.status]}>{SHARED_TASK_STATUS_LABELS[task.status]}</Badge>
                    <Badge variant={priorityTone[task.priority]}>{SHARED_TASK_PRIORITY_LABELS[task.priority]}</Badge>
                  </div>
                  <div className="mt-2 space-y-1 text-sm text-zinc-600">
                    <p>{task.assigneeName ? `Responsable: ${task.assigneeName}` : "Responsable: a definir"}</p>
                    {task.dueAt ? (
                      <p className="inline-flex items-center gap-1 text-zinc-700">
                        <CalendarDays className="h-4 w-4" />
                        Echeance: {formatDueDate(task.dueAt)}
                      </p>
                    ) : null}
                    {task.note ? <p>{task.note}</p> : null}
                    <p className="text-xs text-zinc-500">Creee par {task.createdByName}</p>
                  </div>
                </div>

                {task.priority === SharedTaskPriority.URGENTE ? <AlertCircle className="h-5 w-5 shrink-0 text-rose-500" /> : null}
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {task.canUpdateStatus ? (
                  <>
                    {task.status !== SharedTaskStatus.A_FAIRE ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={async () => {
                          const result = await setSharedTaskStatusAction({ taskId: task.id, status: SharedTaskStatus.A_FAIRE });
                          if (!result.success) {
                            setError(result.message ?? "Mise a jour impossible.");
                            return;
                          }
                          await refreshAfterAction();
                        }}
                      >
                        A faire
                      </Button>
                    ) : null}
                    {task.status !== SharedTaskStatus.EN_COURS ? (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={async () => {
                          const result = await setSharedTaskStatusAction({ taskId: task.id, status: SharedTaskStatus.EN_COURS });
                          if (!result.success) {
                            setError(result.message ?? "Mise a jour impossible.");
                            return;
                          }
                          await refreshAfterAction();
                        }}
                      >
                        En cours
                      </Button>
                    ) : null}
                    <Button
                      size="sm"
                      onClick={async () => {
                        const result = await setSharedTaskStatusAction({ taskId: task.id, status: SharedTaskStatus.TERMINE });
                        if (!result.success) {
                          setError(result.message ?? "Mise a jour impossible.");
                          return;
                        }
                        await refreshAfterAction("Tache terminee.");
                      }}
                    >
                      <CheckCircle2 className="mr-1 h-4 w-4" />
                      Terminer
                    </Button>
                  </>
                ) : null}

                {task.canManage ? (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        setEditingTask({
                          taskId: task.id,
                          title: task.title,
                          note: task.note ?? "",
                          dueAt: task.dueAt ?? "",
                          priority: task.priority,
                          status: task.status,
                          assigneeUserId: task.assigneeUserId ?? "",
                        })
                      }
                    >
                      <Pencil className="mr-1 h-3.5 w-3.5" />
                      Modifier
                    </Button>
                    <ConfirmDestructiveDialog
                      confirmValue={task.title}
                      itemType="tache"
                      triggerLabel="Supprimer"
                      warningMessage="Cette tache sera supprimee definitivement."
                      onConfirm={async () => {
                        const result = await deleteSharedTaskAction({ taskId: task.id });
                        if (!result.success) {
                          setError(result.message ?? "Suppression impossible.");
                          return;
                        }
                        await refreshAfterAction("Tache supprimee.");
                      }}
                    />
                  </>
                ) : null}
              </div>

              {editingTask?.taskId === task.id ? (
                <div className="mt-3 space-y-2 rounded-2xl border border-amber-100 bg-amber-50/40 p-3">
                  <Input value={editingTask.title} onChange={(event) => setEditingTask((prev) => (prev ? { ...prev, title: event.target.value } : prev))} placeholder="Titre" />
                  <Textarea value={editingTask.note} onChange={(event) => setEditingTask((prev) => (prev ? { ...prev, note: event.target.value } : prev))} placeholder="Note" className="min-h-20" />
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <Input type="date" value={editingTask.dueAt} onChange={(event) => setEditingTask((prev) => (prev ? { ...prev, dueAt: event.target.value } : prev))} />
                    <select value={editingTask.priority} onChange={(event) => setEditingTask((prev) => (prev ? { ...prev, priority: event.target.value as SharedTaskPriority } : prev))} className="h-11 w-full rounded-xl border border-amber-100 bg-white px-3 text-sm text-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300">
                      {Object.values(SharedTaskPriority).map((priorityValue) => (
                        <option key={priorityValue} value={priorityValue}>
                          {SHARED_TASK_PRIORITY_LABELS[priorityValue]}
                        </option>
                      ))}
                    </select>
                  </div>
                  <select value={editingTask.status} onChange={(event) => setEditingTask((prev) => (prev ? { ...prev, status: event.target.value as SharedTaskStatus } : prev))} className="h-11 w-full rounded-xl border border-amber-100 bg-white px-3 text-sm text-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300">
                    {Object.values(SharedTaskStatus).map((statusValue) => (
                      <option key={statusValue} value={statusValue}>
                        {SHARED_TASK_STATUS_LABELS[statusValue]}
                      </option>
                    ))}
                  </select>
                  <select value={editingTask.assigneeUserId} onChange={(event) => setEditingTask((prev) => (prev ? { ...prev, assigneeUserId: event.target.value } : prev))} className="h-11 w-full rounded-xl border border-amber-100 bg-white px-3 text-sm text-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300">
                    <option value="">Personne en particulier</option>
                    {memberOptions.map((member) => (
                      <option key={member.id} value={member.id}>
                        {member.name}
                      </option>
                    ))}
                  </select>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      onClick={async () => {
                        if (!editingTask) return;
                        const result = await updateSharedTaskAction({
                          taskId: editingTask.taskId,
                          title: editingTask.title,
                          note: editingTask.note,
                          dueAt: editingTask.dueAt,
                          priority: editingTask.priority,
                          status: editingTask.status,
                          assigneeUserId: editingTask.assigneeUserId,
                        });
                        if (!result.success) {
                          setError(result.message ?? "Modification impossible.");
                          return;
                        }
                        setEditingTask(null);
                        await refreshAfterAction("Tache modifiee.");
                      }}
                    >
                      Enregistrer
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditingTask(null)}>
                      Annuler
                    </Button>
                  </div>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </Card>

      <Card className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="font-serif text-lg">Terminees</CardTitle>
          <Badge variant="default">{completedTasks.length}</Badge>
        </div>
        {completedTasks.length === 0 ? <p className="text-sm text-zinc-600">Aucune tache terminee pour le moment.</p> : null}
        <div className="space-y-2">
          {completedTasks.map((task) => (
            <div key={task.id} className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-3">
              <p className="text-sm font-semibold text-zinc-700 line-through">{task.title}</p>
              <p className="mt-1 text-xs text-zinc-600">{task.assigneeName ? `Responsable: ${task.assigneeName}` : "Sans responsable"}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}