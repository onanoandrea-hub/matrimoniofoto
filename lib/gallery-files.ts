import fs from "fs";
import path from "path";

const IMAGE_EXT = new Set([
  ".jpg",
  ".jpeg",
  ".png",
  ".gif",
  ".webp",
  ".heic",
  ".heif",
]);
const VIDEO_EXT = new Set([".mp4", ".mov", ".webm", ".m4v", ".mkv"]);

export function getUploadDir(): string {
  const raw = process.env.UPLOAD_DIR?.trim();
  if (raw) {
    return path.isAbsolute(raw) ? raw : path.join(process.cwd(), raw);
  }
  return path.join(process.cwd(), "uploads");
}

export function safeUploadFilename(name: string): string | null {
  const base = path.basename(name);
  if (!base || base !== name || base.includes("..")) {
    return null;
  }
  return base;
}

export function mediaKind(filename: string): "image" | "video" | "other" {
  const ext = path.extname(filename).toLowerCase();
  if (IMAGE_EXT.has(ext)) {
    return "image";
  }
  if (VIDEO_EXT.has(ext)) {
    return "video";
  }
  return "other";
}

export type GalleryFileEntry = {
  name: string;
  size: number;
  mtime: string;
  kind: "image" | "video" | "other";
};

export function listGalleryFiles(): GalleryFileEntry[] {
  const dir = getUploadDir();
  if (!fs.existsSync(dir)) {
    return [];
  }

  const names = fs.readdirSync(dir);
  const entries: GalleryFileEntry[] = [];

  for (const name of names) {
    const safe = safeUploadFilename(name);
    if (!safe) {
      continue;
    }
    const full = path.join(dir, safe);
    let stat: fs.Stats;
    try {
      stat = fs.statSync(full);
    } catch {
      continue;
    }
    if (!stat.isFile()) {
      continue;
    }
    const kind = mediaKind(safe);
    if (kind === "other") {
      continue;
    }
    entries.push({
      name: safe,
      size: stat.size,
      mtime: stat.mtime.toISOString(),
      kind,
    });
  }

  entries.sort((a, b) => b.mtime.localeCompare(a.mtime));
  return entries;
}

export function deleteGalleryFile(filename: string): boolean {
  const safe = safeUploadFilename(filename);
  if (!safe || mediaKind(safe) === "other") {
    return false;
  }
  const full = path.join(getUploadDir(), safe);
  if (!fs.existsSync(full)) {
    return false;
  }
  const stat = fs.statSync(full);
  if (!stat.isFile()) {
    return false;
  }
  fs.unlinkSync(full);
  return true;
}

export function resolveUploadFilePath(filename: string): string | null {
  const safe = safeUploadFilename(filename);
  if (!safe) {
    return null;
  }
  const full = path.join(getUploadDir(), safe);
  if (!fs.existsSync(full)) {
    return null;
  }
  const stat = fs.statSync(full);
  if (!stat.isFile()) {
    return null;
  }
  return full;
}

export function contentTypeForFile(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  const map: Record<string, string> = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".gif": "image/gif",
    ".webp": "image/webp",
    ".heic": "image/heic",
    ".heif": "image/heif",
    ".mp4": "video/mp4",
    ".mov": "video/quicktime",
    ".webm": "video/webm",
    ".m4v": "video/mp4",
    ".mkv": "video/x-matroska",
  };
  return map[ext] ?? "application/octet-stream";
}
