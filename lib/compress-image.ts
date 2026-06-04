import { isHeicFile, isImageFile, isVideoFile } from "./media-file";

/** Comprimi solo le foto grandi (risparmio banda). I video passano così. */
export const PROXY_MAX_FILE_BYTES = Math.floor(3.5 * 1024 * 1024);

/** HEIC: il browser non può decodificarlo per canvas — invio originale (allinea a MAX_FILE_MB sul Pi). */
export const HEIC_RAW_MAX_BYTES = 100 * 1024 * 1024;

async function fileFromCanvas(
  canvas: HTMLCanvasElement,
  name: string,
  quality: number
): Promise<File | null> {
  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, "image/jpeg", quality);
  });
  if (!blob) {
    return null;
  }
  const base = name.replace(/\.[^.]+$/, "") || "foto";
  return new File([blob], `${base}.jpg`, {
    type: "image/jpeg",
    lastModified: Date.now(),
  });
}

async function renderToFile(
  source: ImageBitmap,
  maxSide: number,
  name: string,
  quality: number
): Promise<File | null> {
  const scale = Math.min(1, maxSide / Math.max(source.width, source.height));
  const width = Math.max(1, Math.round(source.width * scale));
  const height = Math.max(1, Math.round(source.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return null;
  }
  ctx.drawImage(source, 0, 0, width, height);
  return fileFromCanvas(canvas, name, quality);
}

function heicTooLargeMessage(file: File): string {
  const mb = Math.ceil(file.size / (1024 * 1024));
  return (
    `${file.name} (HEIC, ${mb} MB): il browser non può comprimerla. ` +
    `Invio il file originale solo se è sotto ${Math.floor(HEIC_RAW_MAX_BYTES / (1024 * 1024))} MB ` +
    `(MAX_FILE_MB sul Raspberry). Altrimenti in Fotocamera usa «Formati più compatibili» (JPEG).`
  );
}

async function compressImageFile(
  file: File,
  maxBytes: number
): Promise<File> {
  let bitmap: ImageBitmap | null = null;
  try {
    try {
      bitmap = await createImageBitmap(file);
    } catch {
      if (isHeicFile(file) && file.size <= HEIC_RAW_MAX_BYTES) {
        return file;
      }
      if (file.size <= maxBytes) {
        return file;
      }
      throw new Error(
        isHeicFile(file)
          ? heicTooLargeMessage(file)
          : `Impossibile elaborare ${file.name}. Prova JPEG o un’altra foto.`
      );
    }
    const qualities = [0.88, 0.8, 0.72, 0.64, 0.56, 0.48];
    const maxSides = [2560, 2048, 1920, 1600, 1280, 1024, 800];

    for (const maxSide of maxSides) {
      for (const quality of qualities) {
        const out = await renderToFile(bitmap, maxSide, file.name, quality);
        if (out && out.size <= maxBytes) {
          return out;
        }
      }
    }

    const fallback = await renderToFile(bitmap, 640, file.name, 0.45);
    if (fallback) {
      return fallback;
    }
    throw new Error("compression_failed");
  } finally {
    bitmap?.close();
  }
}

export async function prepareFileForProxyUpload(file: File): Promise<File> {
  if (isVideoFile(file)) {
    return file;
  }

  if (isHeicFile(file)) {
    if (file.size > HEIC_RAW_MAX_BYTES) {
      throw new Error(heicTooLargeMessage(file));
    }
    return file;
  }

  if (file.size <= PROXY_MAX_FILE_BYTES) {
    return file;
  }

  if (!isImageFile(file)) {
    return file;
  }

  const compressed = await compressImageFile(file, PROXY_MAX_FILE_BYTES);
  if (compressed.size > PROXY_MAX_FILE_BYTES) {
    throw new Error(
      `Non riesco a ridurre ${file.name} abbastanza. Prova un’altra immagine o scatta con qualità media.`
    );
  }
  return compressed;
}
