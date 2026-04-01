"use client";

import { useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";

type Circle = {
  id: string;
  name: string;
  photoUrl?: string | null;
  description?: string | null;
};

export function CircleSwitcher({
  circles,
  currentCircleId,
  navigateBasePath,
  queryParamName,
}: {
  circles: Circle[];
  currentCircleId?: string;
  navigateBasePath?: string;
  queryParamName?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();

  const currentCircle = useMemo(
    () => circles.find((circle) => circle.id === currentCircleId) ?? circles.find((circle) => pathname.includes(`/cercles/${circle.id}`)) ?? circles[0],
    [circles, currentCircleId, pathname],
  );

  const handleChange = (nextCircleId: string) => {
    if (navigateBasePath && queryParamName) {
      router.push(`${navigateBasePath}?${queryParamName}=${nextCircleId}`);
      return;
    }

    router.push(`/cercles/${nextCircleId}`);
  };

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-3">
      <label className="mb-2 block text-xs font-medium uppercase text-zinc-500">Cercle actif</label>
      <select
        className="h-10 w-full rounded-xl border border-zinc-300 bg-white px-3 text-sm"
        value={currentCircle?.id}
        onChange={(event) => handleChange(event.target.value)}
      >
        {circles.map((circle) => (
          <option key={circle.id} value={circle.id}>
            {circle.name}
          </option>
        ))}
      </select>
      {currentCircle ? (
        <div className="mt-3 rounded-2xl border border-indigo-100 bg-indigo-50/50 p-3">
          <div className="flex items-center gap-3">
            {currentCircle.photoUrl ? (
              <div
                className="h-10 w-10 rounded-full border border-indigo-100 bg-cover bg-center"
                style={{ backgroundImage: `url(${currentCircle.photoUrl})` }}
                role="img"
                aria-label={`Photo du cercle ${currentCircle.name}`}
              />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 text-sm font-bold text-indigo-700">
                {currentCircle.name.charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <p className="text-sm font-semibold text-zinc-900">{currentCircle.name}</p>
              <p className="text-xs text-zinc-600">{currentCircle.description?.trim() ? currentCircle.description : "Aucune description"}</p>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
