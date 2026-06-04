import { requireGallerySession } from "@/lib/gallery-request";

export const runtime = "nodejs";

/** Verifica se il cookie di sessione galleria è valido. */
export async function GET() {
  const denied = await requireGallerySession();
  if (denied) {
    return denied;
  }
  return Response.json({ ok: true });
}
