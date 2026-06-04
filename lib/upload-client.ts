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

function format401FromBody(body: unknown): string | null {
  if (typeof body !== "object" || body === null) {
    return null;
  }
  const o = body as Record<string, unknown>;

  if (typeof o.error === "string" && o.error.startsWith("Token rifiutato (401)")) {
    return o.error;
  }

  const expected =
    typeof o.expectedToken === "string" ? o.expectedToken : null;
  const sent = typeof o.uploadApiKey === "string" ? o.uploadApiKey : null;
  const received =
    typeof o.receivedAuthorization === "string"
      ? o.receivedAuthorization
      : null;

  if (!expected && !sent) {
    return null;
  }

  let msg =
    `Token rifiutato (401). UPLOAD_API_KEY che ha valore di: "${sent ?? "(mancante in Next — controlla .env.local)"}" ` +
    `deve essere identica a TOKEN sul Raspberry che ha valore di: "${expected ?? "?"}".`;

  if (received) {
    msg += ` Ricevuto dal server upload: "${received}".`;
  }

  if (received === "(mancante)") {
    msg +=
      " Authorization non arriva all'upload API: nginx deve inoltrare tutto a Next (:3000), non diretto a :3001. Controlla /api/env-debug sul sito.";
  }

  return msg;
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

  if (status === 401) {
    const fromBody = format401FromBody(body);
    if (fromBody) {
      errMsg = fromBody;
    } else if (errMsg === "unauthorized") {
      errMsg =
        'Token rifiutato (401). Aggiorna il sito sul Pi (git pull, npm run build, restart foto-sito).';
    }
  }

  if (
    status === 413 ||
    /payload_too_large|entity too large/i.test(errMsg)
  ) {
    errMsg =
      "Foto troppo pesante per il server Vercel (max ~4,5 MB). Riprova: le immagini vengono compresse automaticamente; se persiste, usa foto più piccole.";
  }

  if (
    status === 502 &&
    typeof body === "string" &&
    /bad gateway/i.test(body)
  ) {
    errMsg =
      "502 Bad Gateway: nginx non raggiunge Next (porta 3000). Sul Pi: sudo systemctl status foto-sito foto-upload — poi npm run build e restart. Apri /api/ready";
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
