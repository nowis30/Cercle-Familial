"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type ConversationItem = {
  id: string;
  name: string;
  lastMessage: string;
};

export function ConversationList({ items }: { items: ConversationItem[] }) {
  const [query, setQuery] = useState("");

  const filteredItems = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) {
      return items;
    }

    return items.filter(
      (item) =>
        item.name.toLowerCase().includes(normalizedQuery) ||
        item.lastMessage.toLowerCase().includes(normalizedQuery),
    );
  }, [items, query]);

  return (
    <div className="space-y-3">
      <div className="rounded-3xl border border-indigo-100 bg-white p-4">
        <p className="font-serif text-lg font-bold text-zinc-900">Conversations</p>
        <Input
          className="mt-3"
          placeholder="Rechercher une conversation"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>

      {filteredItems.map((item) => (
        <Link key={item.id} href={`/messages/${item.id}`}>
          <Card className="transition-shadow hover:shadow-[0_12px_22px_-18px_rgba(30,64,175,0.45)]">
            <p className="font-semibold text-zinc-900">{item.name}</p>
            <p className="mt-1 line-clamp-2 text-sm text-zinc-600">{item.lastMessage || "Aucun message"}</p>
          </Card>
        </Link>
      ))}

      {filteredItems.length === 0 ? (
        <Card>
          <p className="text-sm text-zinc-600">Aucune conversation ne correspond a cette recherche.</p>
        </Card>
      ) : null}
    </div>
  );
}