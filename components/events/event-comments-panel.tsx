"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { deleteEventCommentAction, postEventCommentAction } from "@/actions/events";
import { EventComments } from "@/components/chat/event-comments";
import { ConfirmDestructiveDialog } from "@/components/shared/confirm-destructive-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type CommentView = {
  id: string;
  author: string;
  content: string;
  at: string;
  canDelete: boolean;
};

export function EventCommentsPanel({ eventId, comments }: { eventId: string; comments: CommentView[] }) {
  const router = useRouter();
  const [content, setContent] = useState("");

  return (
    <div className="space-y-3">
      <div className="flex gap-2 rounded-2xl border border-indigo-100 bg-white p-2">
        <Input placeholder="Ajouter un commentaire" value={content} onChange={(event) => setContent(event.target.value)} />
        <Button
          onClick={async () => {
            if (!content.trim()) return;
            await postEventCommentAction({ eventId, content });
            setContent("");
            router.refresh();
          }}
        >
          Envoyer
        </Button>
      </div>
      <EventComments messages={comments} />
      {comments.some((comment) => comment.canDelete) ? (
        <div className="space-y-2">
          {comments
            .filter((comment) => comment.canDelete)
            .map((comment) => (
              <ConfirmDestructiveDialog
                key={comment.id}
                confirmValue={`COMMENTAIRE-${comment.id.slice(0, 6).toUpperCase()}`}
                itemType="commentaire"
                triggerLabel={`Supprimer commentaire: ${comment.author}`}
                triggerVariant="ghost"
                warningMessage="Ce commentaire sera supprimé définitivement."
                onConfirm={async () => {
                  await deleteEventCommentAction({ commentId: comment.id });
                  router.refresh();
                }}
              />
            ))}
        </div>
      ) : null}
    </div>
  );
}
