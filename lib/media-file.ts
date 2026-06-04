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

export function isImageFile(file: File): boolean {
  if (file.type.startsWith("image/")) {
    return true;
  }
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  return ["jpg", "jpeg", "png", "gif", "webp", "heic", "heif"].includes(ext);
}
