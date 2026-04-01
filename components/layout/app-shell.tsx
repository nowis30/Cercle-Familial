import { BottomNavigation } from "@/components/layout/bottom-navigation";

type AppShellProps = {
  title: string;
  children: React.ReactNode;
};

export function AppShell({ title, children }: AppShellProps) {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-xl flex-col pb-24">
      <header className="sticky top-0 z-30 border-b border-indigo-100/90 bg-white/85 px-4 py-4 backdrop-blur-xl">
        <h1 className="font-serif text-xl font-bold tracking-tight text-zinc-900">{title}</h1>
      </header>
      <main className="flex-1 space-y-4 px-4 pb-6 pt-4">{children}</main>
      <BottomNavigation />
    </div>
  );
}
