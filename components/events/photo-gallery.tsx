import Image from "next/image";

import { EmptyState } from "@/components/shared/empty-state";
import { Card } from "@/components/ui/card";

type Photo = {
  id: string;
  url: string;
  caption?: string;
};

export function PhotoGallery({ photos }: { photos: Photo[] }) {
  if (photos.length === 0) {
    return <EmptyState title="Aucune photo" description="Ajoutez la premiere photo souvenir de cet evenement." />;
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      {photos.map((photo) => (
        <Card key={photo.id} className="overflow-hidden p-0">
          <div className="relative h-36 w-full">
            <Image src={photo.url} alt={photo.caption ?? "Photo evenement"} fill className="object-cover" />
          </div>
          {photo.caption ? <p className="p-2 text-xs text-zinc-600">{photo.caption}</p> : null}
        </Card>
      ))}
    </div>
  );
}
