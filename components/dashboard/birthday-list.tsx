export function BirthdayList({ items }: { items: Array<{ id: string; name: string; date: string }> }) {
  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li key={item.id} className="flex items-center justify-between rounded-2xl border border-pink-100 bg-pink-50/70 px-3 py-2 text-sm">
          <span className="font-medium text-zinc-800">{item.name}</span>
          <span className="rounded-full bg-white px-2 py-1 text-xs font-semibold text-pink-700">{item.date}</span>
        </li>
      ))}
    </ul>
  );
}
