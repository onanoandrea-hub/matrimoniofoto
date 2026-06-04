import { getBackendBaseUrl } from "@/lib/api";
import { getUploadApiKey, hasUploadApiKey } from "@/lib/backend-auth";

export const runtime = "nodejs";

/** Diagnostica env Next (sul Pi): GET /api/env-debug */
export async function GET() {
  let backendUrl: string | null = null;
  try {
    backendUrl = getBackendBaseUrl();
  } catch {
    backendUrl = null;
  }

  const uploadApiKey = getUploadApiKey() ?? null;

  return Response.json({
    hasUploadApiKey: hasUploadApiKey(),
    uploadApiKey,
    tokenEnv: process.env.TOKEN?.trim() || null,
    uploadApiKeyEnv: process.env.UPLOAD_API_KEY?.trim() || null,
    backendUrl,
    nodeEnv: process.env.NODE_ENV ?? null,
    hint:
      !uploadApiKey
        ? "Manca UPLOAD_API_KEY/TOKEN in Next — aggiungi .env.local e EnvironmentFile nel service foto-sito."
        : null,
  });
}
