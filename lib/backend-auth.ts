const PLACEHOLDER_KEYS = new Set([
  "",
  "cambia-questo-token",
  "VALORE_DEL_TOKEN_RASPBERRY",
  "incolla-qui-la-chiave-del-raspberry",
  "incolla-token-reale-del-pi",
]);

/**
 * Token server-side (mai NEXT_PUBLIC_).
 * Su Vercel va impostato in Project → Settings → Environment Variables.
 */
export function getUploadApiKey(): string | undefined {
  const raw =
    process.env.UPLOAD_API_KEY?.trim() ||
    process.env.TOKEN?.trim() ||
    undefined;

  if (!raw || PLACEHOLDER_KEYS.has(raw)) {
    return undefined;
  }
  return raw;
}

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

export function getMissingUploadKeyMessage(): string {
  if (process.env.VERCEL) {
    return (
      "UPLOAD_API_KEY mancante su Vercel. Vai in Project → Settings → Environment Variables " +
      "e aggiungi UPLOAD_API_KEY con lo stesso valore di TOKEN sul Raspberry. Poi Redeploy."
    );
  }
  return (
    "UPLOAD_API_KEY mancante in .env.local (stesso valore di TOKEN sul Pi). " +
    'Esempio: UPLOAD_API_KEY=il-tuo-token — poi riavvia con "npm run dev".'
  );
}
