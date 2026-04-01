import { ContributionItemRow } from "@/components/events/contribution-item-row";

type Item = {
  id: string;
  name: string;
  quantity: number;
  status: string;
  note?: string;
};

export function ContributionList({ items }: { items: Item[] }) {
  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <ContributionItemRow key={item.id} item={item} />
      ))}
    </ul>
  );
}
