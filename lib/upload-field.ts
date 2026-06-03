/**
 * Nome campo multipart (deve coincidere con multer in server.js, es. .single('files')).
 * Se sul Pi usi un altro nome, imposta NEXT_PUBLIC_UPLOAD_FIELD in .env.local
 */
export const UPLOAD_FILE_FIELD =
  process.env.NEXT_PUBLIC_UPLOAD_FIELD?.trim() || "files";
