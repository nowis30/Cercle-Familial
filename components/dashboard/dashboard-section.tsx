import { Card, CardDescription, CardTitle } from "@/components/ui/card";

type DashboardSectionProps = {
  title: string;
  description?: string;
  children: React.ReactNode;
};

export function DashboardSection({ title, description, children }: DashboardSectionProps) {
  return (
    <Card className="overflow-hidden">
      <div className="mb-3 border-b border-indigo-100/80 pb-3">
        <CardTitle className="font-serif text-lg">{title}</CardTitle>
        {description ? <CardDescription className="mt-1 text-zinc-600">{description}</CardDescription> : null}
      </div>
      <div className="space-y-2">{children}</div>
    </Card>
  );
}
