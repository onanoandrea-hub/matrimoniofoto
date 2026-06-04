/**
 * API upload foto (Express + multer) — stessa root del sito Next.
 * Avvio: npm run start:upload  (porta UPLOAD_PORT, default 3001)
 */

require("dotenv").config();
require("dotenv").config({ path: ".env.local", override: true });

const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const app = express();
const UPLOAD_PORT = Number(process.env.UPLOAD_PORT) || 3001;
const TOKEN = (process.env.TOKEN || process.env.UPLOAD_API_KEY || "").trim();
const UPLOAD_DIR =
  process.env.UPLOAD_DIR || path.join(__dirname, "uploads");
const MAX_FILES = Number(process.env.MAX_FILES) || 50;
const MAX_FILE_MB = Number(process.env.MAX_FILE_MB) || 25;

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

function isLocalRequest(req) {
  const ip = req.socket.remoteAddress || "";
  return (
    ip === "127.0.0.1" ||
    ip === "::1" ||
    ip === "::ffff:127.0.0.1" ||
    ip.endsWith("127.0.0.1")
  );
}

/** Richieste da localhost (proxy Next su :3000 → :3001) non richiedono Bearer. */
function requireBearer(req, res, next) {
  if (isLocalRequest(req)) {
    return next();
  }

  const auth = (req.headers.authorization || "").trim();
  const expected = `Bearer ${TOKEN}`;
  if (auth !== expected) {
    return res.status(401).json({
      error: "unauthorized",
      expectedToken: TOKEN,
      receivedAuthorization: auth || "(mancante)",
    });
  }
  next();
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const fallback =
      file.mimetype && file.mimetype.startsWith("video/")
        ? "video.mov"
        : "foto.jpg";
    const safe = (file.originalname || fallback).replace(/[^\w.\-]+/g, "_");
    cb(null, `${Date.now()}-${safe}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_MB * 1024 * 1024 },
});

const uploadMany = upload.fields([
  { name: "photos", maxCount: MAX_FILES },
  { name: "files", maxCount: MAX_FILES },
]);

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

  const saved = uploaded.map((f) => ({
    field: f.fieldname,
    originalName: f.originalname,
    savedAs: f.filename,
    size: f.size,
    path: f.path,
  }));

  console.log(
    `[upload] ${saved.length} file`,
    saved.map((s) => s.savedAs).join(", ")
  );

  res.json({
    ok: true,
    count: saved.length,
    files: saved,
    messageText:
      saved.length === 1
        ? "1 file caricato con successo."
        : `${saved.length} file caricati con successo.`,
  });
});

app.use((err, _req, res, _next) => {
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

app.listen(UPLOAD_PORT, "127.0.0.1", () => {
  console.log(`Upload API http://127.0.0.1:${UPLOAD_PORT} (solo locale)`);
  console.log(`Cartella upload: ${UPLOAD_DIR}`);
});
