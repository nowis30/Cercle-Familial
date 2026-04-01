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
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-zinc-200 bg-white/95 px-3 py-2 backdrop-blur">
      <ul className="mx-auto flex max-w-xl items-center justify-between">
        {links.map((item) => {
          const Icon = item.icon;
          const active = pathname.startsWith(item.href);

          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={cn(
                  "flex min-w-14 flex-col items-center gap-1 rounded-lg px-2 py-1 text-xs",
                  active ? "text-emerald-700" : "text-zinc-500",
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
