"use client";

import { useState } from "react";
import Image from "next/image";
import { X } from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";
import { Card } from "@/components/ui/card";

type Photo = {
  id: string;
  url: string;
  caption?: string;
};

export function PhotoGallery({ photos }: { photos: Photo[] }) {
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);

  if (photos.length === 0) {
    return <EmptyState title="Aucune photo" description="Ajoutez la premiere photo souvenir de cet evenement." />;
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        {photos.map((photo) => (
          <button key={photo.id} type="button" onClick={() => setSelectedPhoto(photo)} className="text-left">
            <Card className="group overflow-hidden p-0 transition-shadow hover:shadow-[0_16px_28px_-20px_rgba(30,64,175,0.45)]">
              <div className="relative h-36 w-full overflow-hidden">
                <Image src={photo.url} alt={photo.caption ?? "Photo evenement"} fill className="object-cover transition-transform duration-300 group-hover:scale-105" />
              </div>
              {photo.caption ? <p className="line-clamp-2 p-2 text-xs font-medium text-zinc-600">{photo.caption}</p> : null}
            </Card>
          </button>
        ))}
      </div>

      {selectedPhoto ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/80 p-4" role="dialog" aria-modal="true">
          <div className="relative w-full max-w-2xl">
            <button
              type="button"
              onClick={() => setSelectedPhoto(null)}
              className="absolute right-3 top-3 z-10 rounded-full bg-white/90 p-2 text-zinc-700 transition-colors hover:bg-white"
              aria-label="Fermer"
            >
              <X className="h-4 w-4" />
            </button>
            <div className="relative overflow-hidden rounded-3xl border border-white/20 bg-black shadow-2xl">
              <div className="relative h-[65vh] min-h-[320px] w-full">
                <Image src={selectedPhoto.url} alt={selectedPhoto.caption ?? "Photo evenement"} fill className="object-contain" />
              </div>
              {selectedPhoto.caption ? <p className="border-t border-white/20 bg-black/70 px-4 py-3 text-sm text-zinc-100">{selectedPhoto.caption}</p> : null}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
