import { Card, CardDescription, CardTitle } from "@/components/ui/card";

type EmptyStateProps = {
  title: string;
  description: string;
};

export function EmptyState({ title, description }: EmptyStateProps) {
  return (
    <Card className="border-dashed border-indigo-200/80 bg-gradient-to-br from-white to-indigo-50/50 text-center">
      <CardTitle className="font-serif text-lg">{title}</CardTitle>
      <CardDescription className="mt-2 text-zinc-600">{description}</CardDescription>
    </Card>
  );
}
