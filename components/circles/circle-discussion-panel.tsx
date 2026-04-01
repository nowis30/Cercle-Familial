"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { deleteCircleMessageAction, postCircleMessageAction } from "@/actions/circles";
import { CircleChat } from "@/components/chat/circle-chat";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type MessageView = {
  id: string;
  author: string;
  content: string;
  at: string;
  canDelete: boolean;
};

export function CircleDiscussionPanel({ circleId, messages }: { circleId: string; messages: MessageView[] }) {
  const router = useRouter();
  const [content, setContent] = useState("");

  return (
    <div className="space-y-3">
      <div className="flex gap-2 rounded-2xl border border-indigo-100 bg-white p-2">
        <Input placeholder="Ecrire un message" value={content} onChange={(event) => setContent(event.target.value)} />
        <Button
          onClick={async () => {
            if (!content.trim()) return;
            await postCircleMessageAction({ circleId, content });
            setContent("");
            router.refresh();
          }}
        >
          Envoyer
        </Button>
      </div>

      <CircleChat messages={messages} />
      <div className="flex flex-wrap gap-2">
        {messages
          .filter((message) => message.canDelete)
          .map((message) => (
            <Button
              key={message.id}
              size="sm"
              variant="ghost"
              className="text-rose-600 hover:bg-rose-50"
              onClick={async () => {
                if (!window.confirm("Supprimer ce message ?")) return;
                await deleteCircleMessageAction({ messageId: message.id });
                router.refresh();
              }}
            >
              Supprimer message
            </Button>
          ))}
      </div>
    </div>
  );
}
