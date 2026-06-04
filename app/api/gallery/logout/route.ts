import { GALLERY_SESSION_COOKIE } from "@/lib/gallery-auth";

export const runtime = "nodejs";

export async function POST() {
  return Response.json(
    { ok: true },
    {
      headers: {
        "Set-Cookie": `${GALLERY_SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`,
      },
    },
  );
}
