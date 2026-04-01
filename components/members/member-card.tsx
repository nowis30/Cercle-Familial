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
    <Card>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-medium text-zinc-900">{name}</p>
          {note ? <p className="text-xs text-zinc-500">{note}</p> : null}
        </div>
        <RoleBadge role={role} />
      </div>
    </Card>
  );
}
