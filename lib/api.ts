/**
 * URL base dell'API upload (Express). Usata solo server-side dal proxy Next.
 */
export function getBackendBaseUrl(): string {
  const explicit = process.env.UPLOAD_BACKEND_URL?.trim().replace(/\/$/, "");
  if (explicit) {
    return explicit;
  }

  const uploadPort = process.env.UPLOAD_PORT?.trim() || "3001";

  // Sul Pi (stessa root): parla con Express in locale — nginx non inoltra Authorization
  if (!process.env.VERCEL) {
    return `http://127.0.0.1:${uploadPort}`;
  }

  const base = process.env.NEXT_PUBLIC_API_BASE_URL?.trim().replace(/\/$/, "");
  if (!base) {
    throw new Error(
      "NEXT_PUBLIC_API_BASE_URL non configurata (necessaria su Vercel)."
    );
  }
  return base;
}

/** Upload sempre via proxy same-origin. */
export const UPLOAD_PROXY_PATH = "/api/upload";

/** Health via proxy same-origin. */
export const HEALTH_PROXY_PATH = "/api/health";
