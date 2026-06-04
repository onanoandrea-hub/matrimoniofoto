"use client";

import { prepareFileForProxyUpload } from "./compress-image";
import { isVideoFile } from "./media-file";
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
  const fallback = isVideoFile(file) ? "video.mov" : "foto.jpg";
  const safe = file.name.replace(/[^\w.\-]+/g, "_") || fallback;
  return `${Date.now()}-${index}-${safe}`;
}

async function cloneFileForUpload(file: File, index: number): Promise<File> {
  const buffer = await file.arrayBuffer();
  const defaultType = isVideoFile(file) ? "video/quicktime" : "image/jpeg";
  return new File([buffer], uniqueUploadFilename(file, index), {
    type: file.type || defaultType,
    lastModified: file.lastModified,
  });
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
      " Authorization non arriva all'upload API: nginx deve inoltrare tutto a Next (:3000). Controlla /api/env-debug.";
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
        "Token rifiutato (401). Riavvia foto-sito e foto-upload sul Pi.";
    }
  }

  if (errMsg === "file_too_large") {
    errMsg =
      `${fileName} troppo grande. Aumenta MAX_FILE_MB in .env.local sul Pi (es. 100) e client_max_body_size in nginx.`;
  }

  if (
    status === 413 ||
    /payload_too_large|entity too large/i.test(errMsg)
  ) {
    errMsg =
      "File troppo pesante per nginx. Aumenta client_max_body_size nel sito nginx.";
  }

  if (
    status === 502 &&
    typeof body === "string" &&
    /bad gateway/i.test(body)
  ) {
    errMsg =
      "502 Bad Gateway: Next non risponde. Controlla systemctl status foto-sito foto-upload.";
  }

  return errMsg;
}

export async function uploadPhotos(params: UploadOptions): Promise<UploadResult> {
  const { files, onProgress } = params;

  if (files.length === 0) {
    return { ok: false, message: "Seleziona almeno una foto o un video." };
  }

  const total = files.length;
  let uploaded = 0;

  for (let i = 0; i < total; i++) {
    onProgress?.(i + 1, total);

    if (i > 0) {
      await new Promise((resolve) => setTimeout(resolve, 200));
    }

    let fileToSend: File;
    try {
      const cloned = await cloneFileForUpload(files[i], i);
      fileToSend = await prepareFileForProxyUpload(cloned);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Impossibile preparare il file per l'invio.";
      const partial =
        uploaded > 0 ? ` (${uploaded} di ${total} già inviati)` : "";
      return { ok: false, message: `${message}${partial}` };
    }

    const result = await uploadSingleFile(fileToSend);

    if (!result.ok) {
      const errMsg = errorMessageFromBody(
        result.body,
        result.status,
        files[i]?.name ?? `file ${i + 1}`
      );
      const partial =
        uploaded > 0 ? ` (${uploaded} di ${total} già inviati)` : "";
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
    message: `Grazie! ${total} ${total === 1 ? "file caricato" : "file caricati"} con successo.`,
  };
}
