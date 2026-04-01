"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { deleteEventCommentAction, postEventCommentAction } from "@/actions/events";
import { EventComments } from "@/components/chat/event-comments";
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
      <div className="flex gap-2">
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
              <Button
                key={comment.id}
                size="sm"
                variant="ghost"
                onClick={async () => {
                  if (!window.confirm("Supprimer ce commentaire ?")) return;
                  await deleteEventCommentAction({ commentId: comment.id });
                  router.refresh();
                }}
              >
                Supprimer commentaire: {comment.author}
              </Button>
            ))}
        </div>
      ) : null}
    </div>
  );
}
