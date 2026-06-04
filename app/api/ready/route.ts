import { getBackendBaseUrl } from "@/lib/api";
import { hasUploadApiKey } from "@/lib/backend-auth";

export const runtime = "nodejs";

/** Stato servizi: GET /api/ready */
export async function GET() {
  const checks: Record<string, unknown> = {
    next: { ok: true },
    uploadApiKey: hasUploadApiKey(),
  };

  let uploadBackend: { ok: boolean; status?: number; error?: string } = {
    ok: false,
  };

  try {
    const base = getBackendBaseUrl();
    const res = await fetch(`${base}/health`, { cache: "no-store" });
    uploadBackend = { ok: res.ok, status: res.status };
    checks.uploadBackendUrl = base;
  } catch (error) {
    uploadBackend = {
      ok: false,
      error: error instanceof Error ? error.message : "fetch failed",
    };
  }

  checks.uploadBackend = uploadBackend;

  const allOk = checks.uploadApiKey === true && uploadBackend.ok;

  return Response.json(
    {
      ok: allOk,
      message: allOk
        ? "Next e upload API raggiungibili."
        : "Qualcosa non risponde — vedi checks.",
      checks,
    },
    { status: allOk ? 200 : 503 }
  );
}
