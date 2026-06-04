import {
  createGallerySessionToken,
  GALLERY_SESSION_COOKIE,
  galleryEnabledOnHost,
  verifyGalleryCredentials,
} from "@/lib/gallery-auth";
import { galleryUnavailableResponse } from "@/lib/gallery-request";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!galleryEnabledOnHost()) {
    return galleryUnavailableResponse();
  }

  let body: { username?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid_body" }, { status: 400 });
  }

  const username = String(body.username ?? "").trim();
  const password = String(body.password ?? "");

  if (!verifyGalleryCredentials(username, password)) {
    return Response.json({ error: "invalid_credentials" }, { status: 401 });
  }

  const token = createGallerySessionToken();
  const secure = process.env.NODE_ENV === "production";

  return Response.json({ ok: true }, {
    headers: {
      "Set-Cookie": `${GALLERY_SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${60 * 60 * 24 * 7}${secure ? "; Secure" : ""}`,
    },
  });
}
