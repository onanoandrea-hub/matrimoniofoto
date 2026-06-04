const VIDEO_EXTENSIONS = new Set([
  "mov",
  "mp4",
  "m4v",
  "webm",
  "avi",
  "mkv",
  "3gp",
]);

export function isVideoFile(file: File): boolean {
  if (file.type.startsWith("video/")) {
    return true;
  }
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  return VIDEO_EXTENSIONS.has(ext);
}

const HEIC_EXTENSIONS = new Set(["heic", "heif"]);

export function isHeicFile(file: File): boolean {
  const type = file.type.toLowerCase();
  if (type === "image/heic" || type === "image/heif") {
    return true;
  }
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  return HEIC_EXTENSIONS.has(ext);
}

export function isImageFile(file: File): boolean {
  if (file.type.startsWith("image/")) {
    return true;
  }
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  return ["jpg", "jpeg", "png", "gif", "webp", ...HEIC_EXTENSIONS].includes(
    ext
  );
}
