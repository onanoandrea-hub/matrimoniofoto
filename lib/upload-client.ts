"use client";

import { prepareFileForProxyUpload } from "./compress-image";
import { UPLOAD_FILE_FIELD } from "./upload-field";

export type UploadStatus = "idle" | "uploading" | "success" | "error";

export type UploadResult = {
  ok: boolean;
  message: string;
  detail?: unknown;
};

const UPLOAD_PROXY_URL = "/api/upload";

type UploadOptions = {
  files: File[];
  onProgress?: (current: number, total: number) => void;
};

function uniqueUploadFilename(file: File, index: number): string {
  const safe = file.name.replace(/[^\w.\-]+/g, "_") || "foto.jpg";
  return `${Date.now()}-${index}-${safe}`;
}

/** Copia i file in memoria (fix Safari/iOS: il FileList può “svuotarsi” dopo il primo invio). */
async function cloneFilesForUpload(files: File[]): Promise<File[]> {
  return Promise.all(
    files.map(async (file, index) => {
      const buffer = await file.arrayBuffer();
      return new File([buffer], uniqueUploadFilename(file, index), {
        type: file.type || "image/jpeg",
        lastModified: file.lastModified,
      });
    })
  );
}

async function uploadSingleFile(
  file: File
): Promise<{ ok: boolean; status: number; body: unknown }> {
  const formData = new FormData();
  formData.append(UPLOAD_FILE_FIELD, file);

  const response = await fetch(UPLOAD_PROXY_URL, {
    method: "POST",
    body: formData,
    cache: "no-store",
  });

  const contentType = response.headers.get("content-type") ?? "";
  let body: unknown;
  if (contentType.includes("application/json")) {
    body = await response.json();
  } else {
    body = (await response.text()) || null;
  }

  return { ok: response.ok, status: response.status, body };
}

function errorMessageFromBody(
  body: unknown,
  status: number,
  fileName: string
): string {
  let errMsg =
    typeof body === "object" &&
    body !== null &&
    "error" in body &&
    typeof (body as { error: unknown }).error === "string"
      ? (body as { error: string }).error
      : typeof body === "string" && body
        ? body
        : `Errore su ${fileName} (${status})`;

  if (errMsg === "unauthorized" || status === 401) {
    errMsg =
      "Token rifiutato (401). UPLOAD_API_KEY deve essere identica a TOKEN sul Raspberry.";
  }

  if (
    status === 413 ||
    /payload_too_large|entity too large/i.test(errMsg)
  ) {
    errMsg =
      "Foto troppo pesante per il server Vercel (max ~4,5 MB). Riprova: le immagini vengono compresse automaticamente; se persiste, usa foto più piccole.";
  }

  return errMsg;
}

export async function uploadPhotos(params: UploadOptions): Promise<UploadResult> {
  const { files, onProgress } = params;

  if (files.length === 0) {
    return { ok: false, message: "Seleziona almeno una foto." };
  }

  const cloned = await cloneFilesForUpload(files);
  const total = cloned.length;
  let uploaded = 0;

  for (let i = 0; i < total; i++) {
    onProgress?.(i + 1, total);

    if (i > 0) {
      await new Promise((resolve) => setTimeout(resolve, 200));
    }

    let fileToSend: File;
    try {
      fileToSend = await prepareFileForProxyUpload(cloned[i]);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Impossibile preparare la foto per l'invio.";
      const partial =
        uploaded > 0 ? ` (${uploaded} di ${total} già inviate)` : "";
      return { ok: false, message: `${message}${partial}` };
    }

    const result = await uploadSingleFile(fileToSend);

    if (!result.ok) {
      const errMsg = errorMessageFromBody(
        result.body,
        result.status,
        files[i]?.name ?? `foto ${i + 1}`
      );
      const partial =
        uploaded > 0 ? ` (${uploaded} di ${total} già inviate)` : "";
      return {
        ok: false,
        message: `${errMsg}${partial}`,
        detail: result.body,
      };
    }
    uploaded++;
  }

  return {
    ok: true,
    message: `Grazie! ${total} ${total === 1 ? "foto caricata" : "foto caricate"} con successo.`,
  };
}
