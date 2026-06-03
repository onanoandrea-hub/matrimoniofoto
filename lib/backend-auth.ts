/** Solo testi da .env.example — non bloccare token reali sul Pi (anche se corti). */
const PLACEHOLDER_KEYS = new Set([
  "",
  "VALORE_DEL_TOKEN_RASPBERRY",
  "incolla-qui-la-chiave-del-raspberry",
  "incolla-qui-il-token-del-raspberry",
  "incolla-token-reale-del-pi",
]);

export type UploadKeyProblem = "missing" | "placeholder";

export type UploadKeyDiagnostic = {
  ok: boolean;
  problem?: UploadKeyProblem;
  /** Lunghezza del token (0 se assente o placeholder). Mai il valore. */
  length: number;
  /** true se process.env.UPLOAD_API_KEY è definito (anche vuoto). */
  uploadEnvDefined: boolean;
  /** true se process.env.TOKEN è definito (anche vuoto). */
  tokenEnvDefined: boolean;
};

function readRawUploadKey(): string {
  return (
    process.env.UPLOAD_API_KEY?.trim() ||
    process.env.TOKEN?.trim() ||
    ""
  );
}

/**
 * Token server-side (mai NEXT_PUBLIC_).
 * Su Vercel va impostato in Project → Settings → Environment Variables.
 */
export function getUploadApiKey(): string | undefined {
  const raw = readRawUploadKey();
  if (!raw || PLACEHOLDER_KEYS.has(raw)) {
    return undefined;
  }
  return raw;
}

export function getUploadKeyDiagnostic(): UploadKeyDiagnostic {
  const uploadEnvDefined = process.env.UPLOAD_API_KEY !== undefined;
  const tokenEnvDefined = process.env.TOKEN !== undefined;
  const raw = readRawUploadKey();

  if (!raw) {
    return {
      ok: false,
      problem: "missing",
      length: 0,
      uploadEnvDefined,
      tokenEnvDefined,
    };
  }

  if (PLACEHOLDER_KEYS.has(raw)) {
    return {
      ok: false,
      problem: "placeholder",
      length: raw.length,
      uploadEnvDefined,
      tokenEnvDefined,
    };
  }

  return {
    ok: true,
    length: raw.length,
    uploadEnvDefined,
    tokenEnvDefined,
  };
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
  const diagnostic = getUploadKeyDiagnostic();

  if (diagnostic.problem === "placeholder") {
    return (
      "UPLOAD_API_KEY è ancora un valore di esempio (da .env.example). " +
      "Su Vercel sostituiscila con il TOKEN reale del Raspberry, poi Redeploy."
    );
  }

  if (process.env.VERCEL) {
    const env = process.env.VERCEL_ENV ?? "unknown";
    const hints = [
      `Ambiente deploy: ${env}. La variabile deve essere abilitata anche per ${env === "production" ? "Production" : "Preview"} (non solo Development).`,
      "Nome esatto: UPLOAD_API_KEY (maiuscole, underscore).",
      "Valore = stesso TOKEN del .env sul Pi (non incolla-qui-il-token-del-raspberry).",
      "Dopo la modifica: Deployments → ⋯ → Redeploy (non basta salvare).",
      "Controlla: /api/config-status sul tuo dominio Vercel.",
    ];
    if (!diagnostic.uploadEnvDefined && !diagnostic.tokenEnvDefined) {
      return `UPLOAD_API_KEY non arriva al server Vercel. ${hints.join(" ")}`;
    }
    return `UPLOAD_API_KEY vuota o non valida su Vercel. ${hints.join(" ")}`;
  }

  return (
    "UPLOAD_API_KEY mancante in .env.local (stesso valore di TOKEN sul Pi). " +
    'Esempio: UPLOAD_API_KEY=il-tuo-token — poi riavvia con "npm run dev". ' +
    "Controlla: http://localhost:3000/api/config-status"
  );
}
