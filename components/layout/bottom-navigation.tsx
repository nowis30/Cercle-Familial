"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, Circle, House, MessageCircle, User } from "lucide-react";

import { cn } from "@/lib/utils";

const links = [
  { href: "/tableau-de-bord", label: "Accueil", icon: House },
  { href: "/cercles", label: "Cercles", icon: Circle },
  { href: "/messages", label: "Messages", icon: MessageCircle },
  { href: "/profil", label: "Profil", icon: User },
  { href: "/parametres", label: "Reglages", icon: CalendarDays },
];

export function BottomNavigation() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 px-3 pb-[calc(env(safe-area-inset-bottom)+0.6rem)] pt-2">
      <ul className="mx-auto flex max-w-xl items-center justify-between rounded-2xl border border-indigo-100/80 bg-white/95 px-2 py-2 shadow-[0_8px_28px_-18px_rgba(37,99,235,0.45)] backdrop-blur">
        {links.map((item) => {
          const Icon = item.icon;
          const active = pathname.startsWith(item.href);

          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={cn(
                  "flex min-w-14 flex-col items-center gap-1 rounded-xl px-2 py-1.5 text-[11px] font-semibold transition-colors",
                  active ? "bg-indigo-50 text-indigo-700" : "text-zinc-500 hover:text-zinc-700",
                )}
              >
                <Icon className="h-4 w-4" strokeWidth={2.2} />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
