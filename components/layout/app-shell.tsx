import { BottomNavigation } from "@/components/layout/bottom-navigation";

type AppShellProps = {
  title: string;
  children: React.ReactNode;
};

export function AppShell({ title, children }: AppShellProps) {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-xl flex-col bg-zinc-50 pb-20">
      <header className="sticky top-0 z-30 border-b border-zinc-200 bg-white/90 px-4 py-3 backdrop-blur">
        <h1 className="text-lg font-semibold text-zinc-900">{title}</h1>
      </header>
      <main className="flex-1 space-y-4 p-4">{children}</main>
      <BottomNavigation />
    </div>
  );
}
