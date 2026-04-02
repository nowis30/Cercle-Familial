"use client";

import { Pin, PinOff, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import {
  createSharedNoteAction,
  deleteSharedNoteAction,
  setSharedNotePinnedAction,
  updateSharedNoteAction,
} from "@/actions/notes";
import { ConfirmDestructiveDialog } from "@/components/shared/confirm-destructive-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type SharedNoteView = {
  id: string;
  title: string;
  content: string;
  isPinned: boolean;
  createdByName: string;
  createdAtLabel: string;
  canManage: boolean;
};

type SharedNotesBoardProps = {
  circleId: string;
  eventId?: string;
  canCreateNotes: boolean;
  notes: SharedNoteView[];
  contextLabel: string;
};

type EditState = {
  id: string;
  title: string;
  content: string;
  isPinned: boolean;
};

export function SharedNotesBoard({ circleId, eventId, canCreateNotes, notes, contextLabel }: SharedNotesBoardProps) {
  const router = useRouter();
  const [feedback, setFeedback] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isPinned, setIsPinned] = useState(false);
  const [editing, setEditing] = useState<EditState | null>(null);

  function setSuccess(text: string) {
    setFeedback({ tone: "success", text });
  }

  function setError(text: string) {
    setFeedback({ tone: "error", text });
  }

  async function refreshAfterAction(successMessage?: string) {
    router.refresh();
    if (successMessage) setSuccess(successMessage);
  }

  async function onCreateNote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canCreateNotes) {
      setError("Seuls les adultes et admins peuvent creer une note.");
      return;
    }

    setIsSubmitting(true);
    const result = await createSharedNoteAction({
      circleId,
      eventId,
      title,
      content,
      isPinned,
    });
    setIsSubmitting(false);

    if (!result.success) {
      setError(result.message ?? "Creation impossible.");
      return;
    }

    setTitle("");
    setContent("");
    setIsPinned(false);
    await refreshAfterAction("Note ajoutee.");
  }

  return (
    <div className="space-y-4">
      <Card className="space-y-3 bg-gradient-to-br from-white to-emerald-50/60">
        <CardTitle className="font-serif text-lg">Notes partagees</CardTitle>
        <CardDescription>Notes utiles pour {contextLabel}. Tu peux epingler les plus importantes en haut.</CardDescription>

        <form className="space-y-2" onSubmit={onCreateNote}>
          <Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Titre de la note" disabled={!canCreateNotes || isSubmitting} />
          <Textarea
            value={content}
            onChange={(event) => setContent(event.target.value)}
            placeholder="Texte de la note"
            disabled={!canCreateNotes || isSubmitting}
            className="min-h-28"
          />
          <label className="inline-flex items-center gap-2 text-sm text-zinc-700">
            <input type="checkbox" checked={isPinned} onChange={(event) => setIsPinned(event.target.checked)} disabled={!canCreateNotes || isSubmitting} />
            Epingler cette note
          </label>
          <Button type="submit" className="h-11 w-full" disabled={!canCreateNotes || isSubmitting}>
            <Plus className="mr-1 h-4 w-4" />
            Ajouter la note
          </Button>
          {!canCreateNotes ? <p className="text-xs font-medium text-zinc-600">Creation reservee aux adultes et admins.</p> : null}
        </form>

        {feedback ? (
          <p className={`rounded-xl px-3 py-2 text-xs font-semibold ${feedback.tone === "success" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
            {feedback.text}
          </p>
        ) : null}
      </Card>

      {notes.length === 0 ? (
        <Card>
          <p className="text-sm text-zinc-600">Aucune note pour le moment.</p>
        </Card>
      ) : null}

      {notes.map((note) => (
        <Card key={note.id} className={note.isPinned ? "border-emerald-200 bg-emerald-50/30" : ""}>
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-base font-semibold text-zinc-900">{note.title}</p>
                {note.isPinned ? <Badge variant="default">Epinglee</Badge> : null}
              </div>
              <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-700">{note.content}</p>
              <p className="mt-2 text-xs text-zinc-500">Par {note.createdByName} · {note.createdAtLabel}</p>
            </div>
          </div>

          {note.canManage ? (
            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  setEditing({
                    id: note.id,
                    title: note.title,
                    content: note.content,
                    isPinned: note.isPinned,
                  })
                }
              >
                Modifier
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={async () => {
                  const result = await setSharedNotePinnedAction({ noteId: note.id, pinned: !note.isPinned });
                  if (!result.success) {
                    setError(result.message ?? "Mise a jour impossible.");
                    return;
                  }
                  await refreshAfterAction(note.isPinned ? "Note desepinglee." : "Note epinglee.");
                }}
              >
                {note.isPinned ? <PinOff className="mr-1 h-3.5 w-3.5" /> : <Pin className="mr-1 h-3.5 w-3.5" />}
                {note.isPinned ? "Desepingler" : "Epingler"}
              </Button>
              <ConfirmDestructiveDialog
                confirmValue={note.title}
                itemType="note"
                triggerLabel="Supprimer"
                warningMessage="Cette note sera supprimee definitivement."
                onConfirm={async () => {
                  const result = await deleteSharedNoteAction({ noteId: note.id });
                  if (!result.success) {
                    setError(result.message ?? "Suppression impossible.");
                    return;
                  }
                  await refreshAfterAction("Note supprimee.");
                }}
              />
            </div>
          ) : null}

          {editing?.id === note.id ? (
            <div className="mt-3 space-y-2 rounded-2xl border border-emerald-100 bg-emerald-50/40 p-3">
              <Input value={editing.title} onChange={(event) => setEditing((prev) => (prev ? { ...prev, title: event.target.value } : prev))} placeholder="Titre" />
              <Textarea value={editing.content} onChange={(event) => setEditing((prev) => (prev ? { ...prev, content: event.target.value } : prev))} placeholder="Texte" className="min-h-28" />
              <label className="inline-flex items-center gap-2 text-sm text-zinc-700">
                <input type="checkbox" checked={editing.isPinned} onChange={(event) => setEditing((prev) => (prev ? { ...prev, isPinned: event.target.checked } : prev))} />
                Epingler cette note
              </label>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  onClick={async () => {
                    if (!editing) return;
                    const result = await updateSharedNoteAction({
                      noteId: editing.id,
                      title: editing.title,
                      content: editing.content,
                      isPinned: editing.isPinned,
                    });
                    if (!result.success) {
                      setError(result.message ?? "Modification impossible.");
                      return;
                    }
                    setEditing(null);
                    await refreshAfterAction("Note modifiee.");
                  }}
                >
                  Enregistrer
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>
                  Annuler
                </Button>
              </div>
            </div>
          ) : null}
        </Card>
      ))}
    </div>
  );
}
