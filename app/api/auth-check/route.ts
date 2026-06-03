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
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "");

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
    /** Solo in dev locale — mai in produzione */
    uploadApiKey: rawUploadApiKey,
    tokenEnvOnNext: rawTokenEnv,
    authorizationSent: authorization,
    authorizationFormat: authorization
      ? `Bearer ${"*".repeat(Math.max(0, (key?.length ?? 0) - 4))}${key?.slice(-4) ?? ""}`
      : null,
    backendUrl: baseUrl ? `${baseUrl}/upload` : null,
    backendStatus,
    backendBody,
    hint401:
      backendStatus === 401
        ? "Next invia il Bearer sopra. Sul Pi TOKEN nel backend/.env deve essere identico. Se usi DuckDNS, nginx spesso non inoltra Authorization → prova NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:3001 sul Pi o curl diretto a :3001."
        : null,
  });
}
