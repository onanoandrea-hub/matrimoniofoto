import { getBackendBaseUrl } from "@/lib/api";

export const runtime = "nodejs";

export async function GET() {
  try {
    const backendUrl = `${getBackendBaseUrl()}/health`;
    const backendResponse = await fetch(backendUrl, {
      method: "GET",
      cache: "no-store",
    });

    const contentType = backendResponse.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      const data = await backendResponse.json();
      return Response.json(data, { status: backendResponse.status });
    }

    const text = await backendResponse.text();
    return new Response(text || null, { status: backendResponse.status });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Errore proxy health";
    return Response.json({ ok: false, error: message }, { status: 502 });
  }
}
