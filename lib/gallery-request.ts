import { cookies } from "next/headers";
import {
  GALLERY_SESSION_COOKIE,
  galleryEnabledOnHost,
  isValidGallerySession,
} from "@/lib/gallery-auth";

export function galleryUnavailableResponse(): Response {
  return Response.json(
    { error: "gallery_unavailable", message: "Galleria disponibile solo sul server locale." },
    { status: 404 }
  );
}

export async function requireGallerySession(): Promise<Response | null> {
  if (!galleryEnabledOnHost()) {
    return galleryUnavailableResponse();
  }

  const jar = await cookies();
  const token = jar.get(GALLERY_SESSION_COOKIE)?.value;
  if (!isValidGallerySession(token)) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  return null;
}
