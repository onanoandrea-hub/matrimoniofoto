/**
 * Server upload foto matrimonio — da copiare sul Raspberry
 * (es. /home/andrea/Desktop/fotomatrimonio/server.js)
 *
 * Campo multipart atteso dal client Next: "files" (default) o "photos"
 * — usa upload.fields() + normalizzazione req.file / req.files
 */

require("dotenv").config();

const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = Number(process.env.PORT) || 3001;
const TOKEN = process.env.TOKEN || process.env.UPLOAD_API_KEY || "";
const UPLOAD_DIR =
  process.env.UPLOAD_DIR || path.join(__dirname, "uploads");
const MAX_FILES = Number(process.env.MAX_FILES) || 50;
const MAX_FILE_MB = Number(process.env.MAX_FILE_MB) || 25;

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

function requireBearer(req, res, next) {
  const auth = req.headers.authorization || "";
  if (auth !== `Bearer ${TOKEN}`) {
    return res.status(401).json({ error: "unauthorized", expectedToken: TOKEN });
  }
  next();
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const safe = (file.originalname || "foto.jpg").replace(
      /[^\w.\-]+/g,
      "_"
    );
    cb(null, `${Date.now()}-${safe}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_MB * 1024 * 1024 },
});

/** Accetta più file su "photos" e/o "files" (allineato al frontend Next). */
const uploadMany = upload.fields([
  { name: "photos", maxCount: MAX_FILES },
  { name: "files", maxCount: MAX_FILES },
]);

/**
 * Unifica req.file (single) e req.files (array o object da .fields/.array)
 * in un unico array di file caricati.
 */
function normalizeUploadedFiles(req) {
  const list = [];

  if (req.file) {
    list.push(req.file);
  }

  const raw = req.files;
  if (!raw) {
    return list;
  }

  if (Array.isArray(raw)) {
    list.push(...raw);
    return list;
  }

  if (typeof raw === "object") {
    for (const key of Object.keys(raw)) {
      const entry = raw[key];
      if (Array.isArray(entry)) {
        list.push(...entry);
      } else if (entry && entry.fieldname) {
        list.push(entry);
      }
    }
  }

  return list;
}

app.get("/health", (_req, res) => {
  res.json({ ok: true, uploadDir: UPLOAD_DIR });
});

app.post("/upload", requireBearer, uploadMany, (req, res) => {
  const uploaded = normalizeUploadedFiles(req);

  if (!uploaded.length) {
    return res.status(400).json({ error: "no_file" });
  }

  const guestName =
    typeof req.body?.name === "string" ? req.body.name.trim() : "";
  const guestMessage =
    typeof req.body?.message === "string" ? req.body.message.trim() : "";

  const saved = uploaded.map((f) => ({
    field: f.fieldname,
    originalName: f.originalname,
    savedAs: f.filename,
    size: f.size,
    path: f.path,
  }));

  console.log(
    `[upload] ${saved.length} file da ${guestName || "anonimo"}`,
    saved.map((s) => s.savedAs).join(", ")
  );

  res.json({
    ok: true,
    count: saved.length,
    files: saved,
    name: guestName || undefined,
    message: guestMessage || undefined,
    messageText:
      saved.length === 1
        ? "1 foto caricata con successo."
        : `${saved.length} foto caricate con successo.`,
  });
});

app.use((err, req, res, _next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({ error: "file_too_large" });
    }
    if (err.code === "LIMIT_FILE_COUNT") {
      return res.status(400).json({ error: "too_many_files" });
    }
    return res.status(400).json({ error: err.code });
  }
  console.error(err);
  res.status(500).json({ error: "server_error" });
});

app.listen(PORT, () => {
  console.log(`Upload server http://127.0.0.1:${PORT}`);
  console.log(`Cartella upload: ${UPLOAD_DIR}`);
});
