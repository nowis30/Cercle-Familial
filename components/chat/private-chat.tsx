"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { sendDirectMessageAction } from "@/actions/messages";
import { CircleChat } from "@/components/chat/circle-chat";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function PrivateChat({
  conversationId,
  messages,
}: {
  conversationId: string;
  messages: Array<{ id: string; author: string; content: string; at: string }>;
}) {
  const router = useRouter();
  const [content, setContent] = useState("");
  const [feedback, setFeedback] = useState("");

  return (
    <div className="space-y-3">
      {messages.length === 0 ? <EmptyState title="Conversation vide" description="Envoyez le premier message." /> : <CircleChat messages={messages} />}

      <div className="flex gap-2">
        <Input placeholder="Ecrire un message" value={content} onChange={(event) => setContent(event.target.value)} />
        <Button
          onClick={async () => {
            if (!content.trim()) return;
            const result = await sendDirectMessageAction({ conversationId, content });
            if (!result.success) {
              setFeedback(result.message ?? "Message impossible a envoyer.");
              return;
            }
            setContent("");
            setFeedback("");
            router.refresh();
          }}
        >
          Envoyer
        </Button>
      </div>
      {feedback ? <p className="text-xs text-zinc-600">{feedback}</p> : null}
    </div>
  );
}
