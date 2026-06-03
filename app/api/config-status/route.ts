import { getUploadKeyDiagnostic } from "@/lib/backend-auth";

export const runtime = "nodejs";

/** Diagnostica deploy: https://tuo-sito.vercel.app/api/config-status */
export async function GET() {
  const upload = getUploadKeyDiagnostic();
  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL?.trim() ?? "";

  return Response.json({
    uploadApiKey: {
      ok: upload.ok,
      problem: upload.problem ?? null,
      length: upload.length,
      uploadEnvDefined: upload.uploadEnvDefined,
      tokenEnvDefined: upload.tokenEnvDefined,
    },
    nextPublicApiBaseUrl: {
      ok: Boolean(apiBase),
      length: apiBase.length,
      host: apiBase ? safeHost(apiBase) : null,
    },
    vercel: process.env.VERCEL
      ? {
          env: process.env.VERCEL_ENV ?? null,
          url: process.env.VERCEL_URL ?? null,
        }
      : null,
    nodeEnv: process.env.NODE_ENV ?? null,
  });
}

function safeHost(url: string): string | null {
  try {
    return new URL(url).host;
  } catch {
    return null;
  }
}
