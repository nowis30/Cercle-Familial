import { CircleRole } from "@prisma/client";

import { Badge } from "@/components/ui/badge";

const labels: Record<CircleRole, string> = {
  ADMIN: "Admin",
  ADULTE: "Adulte",
  ENFANT: "Enfant",
};

const variants: Record<CircleRole, "default" | "secondary" | "warning"> = {
  ADMIN: "default",
  ADULTE: "secondary",
  ENFANT: "warning",
};

export function RoleBadge({ role }: { role: CircleRole }) {
  return <Badge variant={variants[role]}>{labels[role]}</Badge>;
}
