import { Badge } from "@/components/ui/badge";

type ContributionItem = {
  id: string;
  name: string;
  quantity: number;
  status: string;
  note?: string;
};

const variants: Record<string, "secondary" | "warning" | "default" | "info"> = {
  MANQUANT: "secondary",
  URGENT: "warning",
  CONFIRME: "default",
  APPORTE: "info",
};

const labels: Record<string, string> = {
  MANQUANT: "Manquant",
  URGENT: "Urgent",
  CONFIRME: "Confirme",
  APPORTE: "Apporte",
};

export function ContributionItemRow({ item }: { item: ContributionItem }) {
  return (
    <li className="flex items-start justify-between gap-3 rounded-xl bg-zinc-50 px-3 py-2 text-sm">
      <div>
        <p className="font-medium">
          {item.name} x{item.quantity}
        </p>
        {item.note ? <p className="text-xs text-zinc-500">{item.note}</p> : null}
      </div>
      <Badge variant={variants[item.status] ?? "secondary"}>{labels[item.status] ?? item.status}</Badge>
    </li>
  );
}
