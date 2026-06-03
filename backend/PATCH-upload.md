# Patch route `/upload` sul Raspberry

Se hai già un `server.js`, sostituisci **solo** la parte multer + POST `/upload` con questa.

## 1. Middleware multer (non usare `.single()` per multi-upload)

```js
const MAX_FILES = Number(process.env.MAX_FILES) || 50;

const uploadMany = upload.fields([
  { name: "photos", maxCount: MAX_FILES },
  { name: "files", maxCount: MAX_FILES },
]);

function normalizeUploadedFiles(req) {
  const list = [];
  if (req.file) list.push(req.file);
  const raw = req.files;
  if (!raw) return list;
  if (Array.isArray(raw)) {
    list.push(...raw);
    return list;
  }
  if (typeof raw === "object") {
    for (const key of Object.keys(raw)) {
      const entry = raw[key];
      if (Array.isArray(entry)) list.push(...entry);
      else if (entry?.fieldname) list.push(entry);
    }
  }
  return list;
}
```

## 2. Route (usa `req.files` normalizzati, non solo `req.file`)

```js
app.post("/upload", requireBearer, uploadMany, (req, res) => {
  const uploaded = normalizeUploadedFiles(req);

  if (!uploaded.length) {
    return res.status(400).json({ error: "no_file" });
  }

  // ... salva / rispondi con uploaded.length ...
});
```

## 3. Allineamento nome campo

| Client `formData.append(...)` | Multer sul Pi        |
|------------------------------|----------------------|
| `"photos", file`             | `{ name: "photos" }` |
| `"files", file`              | `{ name: "files" }`  |

Il frontend Next usa **`files`** di default. Con `upload.fields` sopra funzionano **entrambi**.

## 4. Riavvio

```bash
cd /home/andrea/Desktop/fotomatrimonio
# copia server.js aggiornato
npm install   # se serve
node server.js
# oppure pm2 restart ...
```

## 5. Test curl multiplo

```bash
curl -s -X POST http://127.0.0.1:3001/upload \
  -H "Authorization: Bearer IL_TUO_TOKEN" \
  -F "files=@/percorso/foto1.jpg" \
  -F "files=@/percorso/foto2.jpg"
```

Risposta attesa: `"count": 2` (non `no_file`).
