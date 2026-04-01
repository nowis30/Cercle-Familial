import { Card } from "@/components/ui/card";

type CircleMessage = {
  id: string;
  author: string;
  content: string;
  at: string;
};

export function CircleChat({ messages }: { messages: CircleMessage[] }) {
  return (
    <Card className="space-y-2 bg-white">
      {messages.map((message) => (
        <div key={message.id} className="rounded-2xl border border-zinc-200/80 bg-zinc-50/70 p-3">
          <div className="mb-1 flex items-center justify-between text-xs text-zinc-500">
            <span className="font-semibold text-zinc-700">{message.author}</span>
            <span>{message.at}</span>
          </div>
          <p className="text-sm leading-6 text-zinc-800">{message.content}</p>
        </div>
      ))}
    </Card>
  );
}
