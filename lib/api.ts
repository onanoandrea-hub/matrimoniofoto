/**
 * URL base del backend Raspberry.
 * Usata dalle Route Handler server-side (proxy verso HTTP senza mixed content).
 */
export function getBackendBaseUrl(): string {
  const base = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "");
  if (!base) {
    throw new Error(
      "NEXT_PUBLIC_API_BASE_URL non configurata. Impostala in .env.local o su Vercel."
    );
  }
  return base;
}

/** Upload sempre via proxy (evita mixed content su Vercel HTTPS). */
export const UPLOAD_PROXY_PATH = "/api/upload";

/** Health via proxy same-origin. */
export const HEALTH_PROXY_PATH = "/api/health";
