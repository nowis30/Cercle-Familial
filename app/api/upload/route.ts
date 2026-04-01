import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import crypto from "node:crypto";

import { NextResponse } from "next/server";

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
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Fichier invalide" }, { status: 400 });
    }

    if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
      return NextResponse.json({ error: "Type de fichier non autorise (jpg, png, webp, gif)" }, { status: 400 });
    }

    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      return NextResponse.json({ error: `Fichier trop volumineux (max ${MAX_SIZE_MB} Mo)` }, { status: 400 });
    }

    const extension = EXTENSIONS_BY_MIME[file.type];
    if (!extension) {
      return NextResponse.json({ error: "Extension non supportee" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const fileName = `${Date.now()}-${crypto.randomBytes(8).toString("hex")}${extension}`;
    const uploadDir = join(process.cwd(), "public", "uploads", "events");

    await mkdir(uploadDir, { recursive: true });
    await writeFile(join(uploadDir, fileName), buffer);

    return NextResponse.json({ url: `/uploads/events/${fileName}`, size: file.size, mimeType: file.type });
  } catch (error) {
    const code = typeof error === "object" && error !== null && "code" in error ? String((error as { code?: string }).code) : "";

    if (code === "EROFS" || code === "EPERM") {
      return NextResponse.json(
        {
          error:
            "Televersement indisponible sur cet environnement de production (stockage local en lecture seule). Configurez un stockage externe pour les photos.",
        },
        { status: 503 },
      );
    }

    console.error("[upload] Erreur POST /api/upload", error);
    return NextResponse.json({ error: "Erreur de televersement" }, { status: 500 });
  }
}
