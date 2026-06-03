/**
 * Vercel Functions: body request max ~4.5 MB (non aumentabile).
 * Il proxy /api/upload inoltra il file → serve margine per multipart.
 */
export const PROXY_MAX_FILE_BYTES = Math.floor(3.5 * 1024 * 1024);

function formatMb(bytes: number): string {
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

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

async function compressImageFile(
  file: File,
  maxBytes: number
): Promise<File> {
  let bitmap: ImageBitmap | null = null;
  try {
    bitmap = await createImageBitmap(file);
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
  if (file.size <= PROXY_MAX_FILE_BYTES) {
    return file;
  }

  if (!file.type.startsWith("image/")) {
    throw new Error(
      `${file.name} è troppo grande (${formatMb(file.size)}). Su Vercel il massimo è circa 3,5 MB per foto.`
    );
  }

  const compressed = await compressImageFile(file, PROXY_MAX_FILE_BYTES);
  if (compressed.size > PROXY_MAX_FILE_BYTES) {
    throw new Error(
      `Non riesco a ridurre ${file.name} abbastanza. Prova un’altra immagine o scatta con qualità media.`
    );
  }
  return compressed;
}
