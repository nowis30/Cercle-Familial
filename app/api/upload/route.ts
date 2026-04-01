import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import crypto from "node:crypto";

import { NextResponse } from "next/server";
import { put } from "@vercel/blob";

import { auth } from "@/lib/auth";

const MAX_SIZE_MB = 8;
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const EXTENSIONS_BY_MIME: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
};

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Session invalide", code: "INVALID_SESSION" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Fichier invalide", code: "INVALID_FILE" }, { status: 400 });
    }

    if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
      return NextResponse.json({ error: "Type de fichier non autorise (jpg, png, webp, gif)", code: "INVALID_MIME_TYPE" }, { status: 400 });
    }

    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      return NextResponse.json({ error: `Fichier trop volumineux (max ${MAX_SIZE_MB} Mo)`, code: "FILE_TOO_LARGE" }, { status: 400 });
    }

    const extension = EXTENSIONS_BY_MIME[file.type];
    if (!extension) {
      return NextResponse.json({ error: "Extension non supportee", code: "UNSUPPORTED_EXTENSION" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const fileName = `${Date.now()}-${crypto.randomBytes(8).toString("hex")}${extension}`;

    if (process.env.BLOB_READ_WRITE_TOKEN) {
      const blob = await put(`events/${fileName}`, buffer, {
        access: "public",
        contentType: file.type,
        addRandomSuffix: false,
      });

      return NextResponse.json({ url: blob.url, size: file.size, mimeType: file.type, storage: "blob" });
    }

    const uploadDir = join(process.cwd(), "public", "uploads", "events");

    await mkdir(uploadDir, { recursive: true });
    await writeFile(join(uploadDir, fileName), buffer);

    return NextResponse.json({ url: `/uploads/events/${fileName}`, size: file.size, mimeType: file.type, storage: "local" });
  } catch (error) {
    const code = typeof error === "object" && error !== null && "code" in error ? String((error as { code?: string }).code) : "";

    if (code === "EROFS" || code === "EPERM") {
      console.error("[upload] Ecriture impossible sur le stockage local", { code });
      return NextResponse.json(
        {
          error:
            "Televersement indisponible sur cet environnement de production (stockage local en lecture seule). Configurez un stockage externe pour les photos.",
          code: "STORAGE_READ_ONLY",
        },
        { status: 503 },
      );
    }

    if (code === "ENOSPC") {
      console.error("[upload] Plus d'espace disque", { code });
      return NextResponse.json({ error: "Televersement impossible: espace disque insuffisant.", code: "NO_SPACE_LEFT" }, { status: 507 });
    }

    console.error("[upload] Erreur POST /api/upload", {
      code,
      message: error instanceof Error ? error.message : "Erreur inconnue",
      stack: error instanceof Error ? error.stack : undefined,
    });
    return NextResponse.json({ error: "Erreur de televersement", code: "UPLOAD_WRITE_FAILED" }, { status: 500 });
  }
}
