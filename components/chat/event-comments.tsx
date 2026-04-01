import { CircleChat } from "@/components/chat/circle-chat";

export function EventComments({ messages }: { messages: Array<{ id: string; author: string; content: string; at: string }> }) {
  return <CircleChat messages={messages} />;
}
