import { CircleRole } from "@prisma/client";

import { RoleBadge } from "@/components/shared/role-badge";
import { Card } from "@/components/ui/card";

type MemberCardProps = {
  name: string;
  role: CircleRole;
  note?: string;
};

export function MemberCard({ name, role, note }: MemberCardProps) {
  return (
    <Card className="transition-shadow hover:shadow-[0_12px_22px_-20px_rgba(30,64,175,0.45)]">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-base font-semibold text-zinc-900">{name}</p>
          {note ? <p className="mt-1 text-xs text-zinc-500">{note}</p> : null}
        </div>
        <RoleBadge role={role} />
      </div>
    </Card>
  );
}
