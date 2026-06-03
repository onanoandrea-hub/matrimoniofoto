/**
 * Auth verso Express sul Raspberry (solo server-side).
 * Deve coincidere con: auth === `Bearer ${TOKEN}` in server.js
 */
export function getUploadApiKey(): string | undefined {
  return process.env.UPLOAD_API_KEY?.trim() || undefined;
}

/** Valore esatto dell'header Authorization richiesto dal backend. */
export function getBearerAuthorizationValue(): string | null {
  const key = getUploadApiKey();
  if (!key) {
    return null;
  }
  return `Bearer ${key}`;
}

export function hasUploadApiKey(): boolean {
  return Boolean(getUploadApiKey());
}
