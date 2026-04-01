export function BirthdayList({ items }: { items: Array<{ id: string; name: string; date: string }> }) {
  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li key={item.id} className="flex items-center justify-between rounded-xl bg-zinc-50 px-3 py-2 text-sm">
          <span>{item.name}</span>
          <span className="text-zinc-500">{item.date}</span>
        </li>
      ))}
    </ul>
  );
}
