import { Card } from "@/components/ui/card";

type CircleMessage = {
  id: string;
  author: string;
  content: string;
  at: string;
};

export function CircleChat({ messages }: { messages: CircleMessage[] }) {
  return (
    <Card className="space-y-2">
      {messages.map((message) => (
        <div key={message.id} className="rounded-xl bg-zinc-50 p-3">
          <div className="mb-1 flex items-center justify-between text-xs text-zinc-500">
            <span>{message.author}</span>
            <span>{message.at}</span>
          </div>
          <p className="text-sm text-zinc-800">{message.content}</p>
        </div>
      ))}
    </Card>
  );
}
