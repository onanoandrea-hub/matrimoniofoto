import { createHmac, timingSafeEqual } from "crypto";

export const GALLERY_SESSION_COOKIE = "gallery_session";

const DEFAULT_USER = "admin";
const DEFAULT_PASS = "C@gl1@r1";

function sessionSecret(): string {
  return (
    process.env.GALLERY_SESSION_SECRET?.trim() ||
    process.env.UPLOAD_API_KEY?.trim() ||
    process.env.TOKEN?.trim() ||
    "gallery-session-fallback"
  );
}

export function getGalleryCredentials(): { user: string; pass: string } {
  return {
    user: process.env.GALLERY_USER?.trim() || DEFAULT_USER,
    pass: process.env.GALLERY_PASSWORD?.trim() || DEFAULT_PASS,
  };
}

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) {
    return false;
  }
  return timingSafeEqual(bufA, bufB);
}

export function verifyGalleryCredentials(
  username: string,
  password: string
): boolean {
  const { user, pass } = getGalleryCredentials();
  return safeEqual(username, user) && safeEqual(password, pass);
}

export function createGallerySessionToken(): string {
  const { user } = getGalleryCredentials();
  return createHmac("sha256", sessionSecret())
    .update(`gallery:${user}`)
    .digest("hex");
}

export function isValidGallerySession(token: string | undefined | null): boolean {
  if (!token || typeof token !== "string") {
    return false;
  }
  const expected = createGallerySessionToken();
  return safeEqual(token, expected);
}

export function galleryEnabledOnHost(): boolean {
  if (process.env.GALLERY_DISABLED === "1") {
    return false;
  }
  if (process.env.VERCEL) {
    return false;
  }
  return true;
}
