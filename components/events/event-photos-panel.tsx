"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { addEventPhotoAction, deleteEventPhotoAction } from "@/actions/events";
import { PhotoGallery } from "@/components/events/photo-gallery";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type PhotoView = {
  id: string;
  url: string;
  caption?: string | null;
  canDelete: boolean;
};

export function EventPhotosPanel({ eventId, photos }: { eventId: string; photos: PhotoView[] }) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [caption, setCaption] = useState("");
  const [feedback, setFeedback] = useState("");

  return (
    <div className="space-y-3">
      <div className="space-y-2 rounded-2xl border border-zinc-200 bg-white p-3">
        <Input type="file" accept="image/*" onChange={(event) => setFile(event.target.files?.[0] ?? null)} />
        <Input placeholder="Legende (facultative)" value={caption} onChange={(event) => setCaption(event.target.value)} />
        <Button
          onClick={async () => {
            if (!file) {
              setFeedback("Choisir une image.");
              return;
            }

            const formData = new FormData();
            formData.append("file", file);
            const uploadRes = await fetch("/api/upload", { method: "POST", body: formData });
            if (!uploadRes.ok) {
              setFeedback("Echec upload.");
              return;
            }
            const body = (await uploadRes.json()) as { url: string };
            await addEventPhotoAction({ eventId, url: body.url, caption });
            setFile(null);
            setCaption("");
            setFeedback("Photo ajoutee.");
            router.refresh();
          }}
        >
          Ajouter la photo
        </Button>
        {feedback ? <p className="text-xs text-zinc-600">{feedback}</p> : null}
      </div>

      <PhotoGallery photos={photos.map((photo) => ({ id: photo.id, url: photo.url, caption: photo.caption ?? undefined }))} />
      <div className="flex flex-wrap gap-2">
        {photos
          .filter((photo) => photo.canDelete)
          .map((photo) => (
            <Button
              key={photo.id}
              size="sm"
              variant="ghost"
              onClick={async () => {
                if (!window.confirm("Supprimer cette photo ?")) return;
                await deleteEventPhotoAction({ photoId: photo.id });
                router.refresh();
              }}
            >
              Supprimer photo
            </Button>
          ))}
      </div>
    </div>
  );
}
