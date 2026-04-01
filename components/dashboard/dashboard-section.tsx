import { Card, CardDescription, CardTitle } from "@/components/ui/card";

type DashboardSectionProps = {
  title: string;
  description?: string;
  children: React.ReactNode;
};

export function DashboardSection({ title, description, children }: DashboardSectionProps) {
  return (
    <Card>
      <CardTitle>{title}</CardTitle>
      {description ? <CardDescription className="mt-1">{description}</CardDescription> : null}
      <div className="mt-3 space-y-2">{children}</div>
    </Card>
  );
}
