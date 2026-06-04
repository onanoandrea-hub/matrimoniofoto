import fs from "fs";
import path from "path";
import {
  contentTypeForFile,
  mediaKind,
  resolveUploadFilePath,
} from "@/lib/gallery-files";
import { requireGallerySession } from "@/lib/gallery-request";

export const runtime = "nodejs";

type Params = { params: Promise<{ name: string }> };

export async function GET(_request: Request, { params }: Params) {
  const denied = await requireGallerySession();
  if (denied) {
    return denied;
  }

  const { name } = await params;
  const filePath = resolveUploadFilePath(decodeURIComponent(name));
  const base = filePath ? path.basename(filePath) : "";
  if (!filePath || mediaKind(base) === "other") {
    return Response.json({ error: "not_found" }, { status: 404 });
  }

  const stat = fs.statSync(filePath);
  const body = fs.readFileSync(filePath);

  return new Response(body, {
    headers: {
      "Content-Type": contentTypeForFile(filePath),
      "Content-Length": String(stat.size),
      "Cache-Control": "private, max-age=3600",
    },
  });
}
