import { getBackendBaseUrl } from "@/lib/api";
import { getBearerAuthorizationValue, getUploadApiKey, hasUploadApiKey } from "@/lib/backend-auth";
import { UPLOAD_FILE_FIELD } from "@/lib/upload-field";

export const runtime = "nodejs";

/** Diagnostica dev: http://localhost:3000/api/auth-check */
export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  const key = getUploadApiKey();
  const rawUploadApiKey = process.env.UPLOAD_API_KEY?.trim() ?? null;
  const rawTokenEnv = process.env.TOKEN?.trim() ?? null;
  const authorization = getBearerAuthorizationValue();

  let baseUrl: string | null = null;
  try {
    baseUrl = getBackendBaseUrl();
  } catch {
    baseUrl = null;
  }

  let backendStatus: number | null = null;
  let backendBody: unknown = null;

  if (hasUploadApiKey() && baseUrl && authorization) {
    try {
      const form = new FormData();
      form.append(
        UPLOAD_FILE_FIELD,
        new Blob(["probe"], { type: "image/jpeg" }),
        "probe.jpg"
      );

      const res = await fetch(`${baseUrl}/upload`, {
        method: "POST",
        headers: { Authorization: authorization },
        body: form,
      });
      backendStatus = res.status;
      const ct = res.headers.get("content-type") ?? "";
      backendBody = ct.includes("application/json")
        ? await res.json()
        : await res.text();
    } catch (error) {
      backendBody = {
        error: error instanceof Error ? error.message : "fetch failed",
      };
    }
  }

  return Response.json({
    keyConfigured: hasUploadApiKey(),
    keyLength: key?.length ?? 0,
    uploadApiKey: rawUploadApiKey,
    tokenEnv: rawTokenEnv,
    authorizationSent: authorization,
    backendUrl: baseUrl ? `${baseUrl}/upload` : null,
    backendStatus,
    backendBody,
    hint401:
      backendStatus === 401
        ? "Avvia npm run start:upload e verifica TOKEN = UPLOAD_API_KEY in .env.local"
        : null,
  });
}
