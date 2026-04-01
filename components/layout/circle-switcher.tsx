"use client";

import { useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";

type Circle = {
  id: string;
  name: string;
};

export function CircleSwitcher({ circles }: { circles: Circle[] }) {
  const router = useRouter();
  const pathname = usePathname();

  const currentCircle = useMemo(
    () => circles.find((circle) => pathname.includes(`/cercles/${circle.id}`)) ?? circles[0],
    [circles, pathname],
  );

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-3">
      <label className="mb-2 block text-xs font-medium uppercase text-zinc-500">Cercle actif</label>
      <select
        className="h-10 w-full rounded-xl border border-zinc-300 bg-white px-3 text-sm"
        value={currentCircle?.id}
        onChange={(event) => router.push(`/cercles/${event.target.value}`)}
      >
        {circles.map((circle) => (
          <option key={circle.id} value={circle.id}>
            {circle.name}
          </option>
        ))}
      </select>
    </div>
  );
}
