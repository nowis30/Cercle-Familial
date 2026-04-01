import { Badge } from "@/components/ui/badge";

type ContributionItem = {
  id: string;
  name: string;
  quantity: number;
  status: string;
  note?: string;
  carrierName?: string;
};

const variants: Record<string, "secondary" | "warning" | "default" | "info" | "danger"> = {
  MANQUANT: "danger",
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
  const carrierDisplay = item.carrierName?.trim() ? item.carrierName : "non attribue";

  return (
    <li className="flex items-start justify-between gap-3 rounded-2xl border border-zinc-200/80 bg-zinc-50/70 px-3 py-2 text-sm">
      <div>
        <p className="font-semibold text-zinc-900">{item.name}</p>
        <p className="text-xs text-zinc-600">Quantite: {item.quantity}</p>
        <p className="text-xs text-zinc-600">Apporte par : {carrierDisplay}</p>
        {item.note ? <p className="text-xs text-zinc-500">{item.note}</p> : null}
      </div>
      <Badge variant={variants[item.status] ?? "secondary"}>{labels[item.status] ?? item.status}</Badge>
    </li>
  );
}
