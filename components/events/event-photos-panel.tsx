"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import { addEventPhotoAction, deleteEventPhotoAction } from "@/actions/events";
import { PhotoGallery } from "@/components/events/photo-gallery";
import { ConfirmDestructiveDialog } from "@/components/shared/confirm-destructive-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/** Réduit et compresse une image côté client pour les uploads mobiles. */
async function compressImage(file: File, maxDimension = 1920, quality = 0.85): Promise<File> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      if (width > maxDimension || height > maxDimension) {
        if (width >= height) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) { resolve(file); return; }
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          if (!blob) { resolve(file); return; }
          resolve(new File([blob], file.name.replace(/\.[^.]+$/, ".jpg"), { type: "image/jpeg" }));
        },
        "image/jpeg",
        quality,
      );
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Lecture image echouee")); };
    img.src = url;
  });
}

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
  const [isErrorFeedback, setIsErrorFeedback] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<"idle" | "compressing" | "uploading">("idle");

  const mapUploadApiError = (code?: string, fallback?: string) => {
    switch (code) {
      case "FILE_TOO_LARGE":
        return "Fichier trop volumineux (max 20 Mo).";
      case "INVALID_MIME_TYPE":
        return "Type de fichier non autorise. Utilisez jpg, png, webp ou gif.";
      case "INVALID_FILE":
        return "Fichier invalide. Reessayez avec une image.";
      case "STORAGE_READ_ONLY":
        return "Stockage local non disponible en production. Configurez un stockage externe (Blob, S3, Cloudinary).";
      case "NO_SPACE_LEFT":
        return "Stockage plein: impossible de televerser la photo.";
      case "UPLOAD_WRITE_FAILED":
        return "Echec ecriture fichier sur le serveur.";
      default:
        return fallback ?? "Echec du televersement.";
    }
  };

  const mapDatabaseError = (code?: string, fallback?: string) => {
    switch (code) {
      case "PERMISSION_DENIED":
        return "Permission refusee pour cet evenement.";
      case "DATABASE_SAVE_FAILED":
        return "Photo envoyee, mais echec d'enregistrement en base de donnees.";
      case "EVENT_NOT_FOUND":
        return "Evenement introuvable.";
      default:
        return fallback ?? "Impossible d'associer la photo a l'evenement.";
    }
  };

  return (
    <div className="space-y-3">
      <div className="space-y-2 rounded-2xl border border-indigo-100 bg-indigo-50/40 p-3">
        <Input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={(event) => {
            setFeedback("");
            setIsErrorFeedback(false);
            setFile(event.target.files?.[0] ?? null);
          }}
        />
        {file ? <p className="text-xs font-medium text-zinc-600">Fichier: {file.name}</p> : null}
        <Input placeholder="Legende (facultative)" value={caption} onChange={(event) => setCaption(event.target.value)} />
        <Button
          className="w-full"
          disabled={isUploading}
          onClick={async () => {
            if (!file) {
              setIsErrorFeedback(true);
              setFeedback("Choisir une image.");
              return;
            }

            setIsUploading(true);
            setFeedback("");
            setIsErrorFeedback(false);

            let fileToUpload = file;
            try {
              setUploadStatus("compressing");
              fileToUpload = await compressImage(file);
            } catch {
              // compression échouée, on envoie le fichier original
            }

            setUploadStatus("uploading");
            const formData = new FormData();
            formData.append("file", fileToUpload);
            const uploadRes = await fetch("/api/upload", { method: "POST", body: formData });
            const uploadBody = (await uploadRes.json().catch(() => ({}))) as { error?: string; code?: string; url?: string };

            if (!uploadRes.ok) {
              setIsErrorFeedback(true);
              setFeedback(mapUploadApiError(uploadBody.code, uploadBody.error));
              setIsUploading(false);
              setUploadStatus("idle");
              return;
            }

            const result = await addEventPhotoAction({ eventId, url: uploadBody.url ?? "", caption });
            if (!result.success) {
              setIsErrorFeedback(true);
              setFeedback(mapDatabaseError((result as { code?: string }).code, result.message));
              setIsUploading(false);
              setUploadStatus("idle");
              return;
            }

            setFile(null);
            setCaption("");
            if (fileInputRef.current) {
              fileInputRef.current.value = "";
            }
            setIsErrorFeedback(false);
            setFeedback("Photo ajoutee.");
            setIsUploading(false);
            setUploadStatus("idle");
            router.refresh();
          }}
        >
          {uploadStatus === "compressing" ? "Compression en cours..." : uploadStatus === "uploading" ? "Televersement..." : "Ajouter une photo"}
        </Button>
        {feedback ? <p className={`text-xs font-medium ${isErrorFeedback ? "text-rose-700" : "text-emerald-700"}`}>{feedback}</p> : null}
      </div>

      <PhotoGallery photos={photos.map((photo) => ({ id: photo.id, url: photo.url, caption: photo.caption ?? undefined }))} />
      <div className="flex flex-wrap gap-2 rounded-2xl border border-zinc-200/80 bg-white p-2">
        {photos
          .filter((photo) => photo.canDelete)
          .map((photo) => (
            <ConfirmDestructiveDialog
              key={photo.id}
              confirmValue={`PHOTO-${photo.id.slice(0, 6).toUpperCase()}`}
              itemType="photo"
              triggerLabel="Supprimer photo"
              triggerVariant="ghost"
              warningMessage="Cette photo sera supprimée définitivement de l'événement."
              onConfirm={async () => {
                await deleteEventPhotoAction({ photoId: photo.id });
                router.refresh();
              }}
            />
          ))}
      </div>
    </div>
  );
}
