import { getUploadDir, listGalleryFiles } from "@/lib/gallery-files";
import { requireGallerySession } from "@/lib/gallery-request";

export const runtime = "nodejs";

export async function GET() {
  const denied = await requireGallerySession();
  if (denied) {
    return denied;
  }

  const files = listGalleryFiles();
  return Response.json({
    ok: true,
    count: files.length,
    uploadDir: getUploadDir(),
    files,
  });
}
