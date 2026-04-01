"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

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
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [caption, setCaption] = useState("");
  const [feedback, setFeedback] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  return (
    <div className="space-y-3">
      <div className="space-y-2 rounded-2xl border border-zinc-200 bg-white p-3">
        <Input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          capture="environment"
          onChange={(event) => {
            setFeedback("");
            setFile(event.target.files?.[0] ?? null);
          }}
        />
        {file ? <p className="text-xs text-zinc-500">Fichier: {file.name}</p> : null}
        <Input placeholder="Legende (facultative)" value={caption} onChange={(event) => setCaption(event.target.value)} />
        <Button
          className="w-full"
          disabled={isUploading}
          onClick={async () => {
            if (!file) {
              setFeedback("Choisir une image.");
              return;
            }

            setIsUploading(true);
            setFeedback("");

            const formData = new FormData();
            formData.append("file", file);
            const uploadRes = await fetch("/api/upload", { method: "POST", body: formData });
            const uploadBody = (await uploadRes.json().catch(() => ({}))) as { error?: string; url?: string };

            if (!uploadRes.ok) {
              setFeedback(uploadBody.error ?? "Echec du televersement.");
              setIsUploading(false);
              return;
            }

            const result = await addEventPhotoAction({ eventId, url: uploadBody.url ?? "", caption });
            if (!result.success) {
              setFeedback(result.message ?? "Impossible d'associer la photo a l'evenement.");
              setIsUploading(false);
              return;
            }

            setFile(null);
            setCaption("");
            if (fileInputRef.current) {
              fileInputRef.current.value = "";
            }
            setFeedback("Photo ajoutee.");
            setIsUploading(false);
            router.refresh();
          }}
        >
          {isUploading ? "Televersement..." : "Ajouter une photo"}
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
