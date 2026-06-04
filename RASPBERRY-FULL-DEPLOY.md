# Deploy sul Raspberry (una sola cartella)

Tutto il progetto vive in **un’unica directory**. Due processi Node dalla stessa root:

| Comando | Cosa | Porta |
|---------|------|-------|
| `npm run start:upload` | API upload (`upload-server.js`) | **3001** |
| `npm run build` + `npm run start` | Sito Next.js | **3000** |

nginx (HTTPS) inoltra il traffico a Next (:3000). Next parla con l’upload API su **127.0.0.1:3001**.

L’upload API accetta richieste **da localhost senza Bearer** (il proxy Next è sulla stessa macchina). Il token serve solo per chiamate esterne dirette alla porta 3001 (che è in ascolto solo su 127.0.0.1).

---

## 1. Preparazione sul Pi

```bash
mkdir -p ~/fotomatrimonio
cd ~/fotomatrimonio
git clone https://github.com/onanoandrea-hub/matrimoniofoto.git .
bash scripts/pi-install.sh
npm run build
```

> **Nota:** il progetto **non include ESLint** (troppi pacchetti per la SD del Pi). Usa `bash scripts/pi-install.sh` invece di un semplice `npm install` dopo errori `TAR_ENTRY_ERROR`.

Copia le variabili:

```bash
cp .env.example .env.local
nano .env.local
```

Esempio `.env.local`:

```env
UPLOAD_API_KEY=cambia-questo-token
TOKEN=cambia-questo-token
UPLOAD_PORT=3001
UPLOAD_DIR=/home/andrea/fotomatrimonio/uploads
MAX_FILE_MB=100
```

`UPLOAD_API_KEY` e `TOKEN` devono essere **identici**.

---

## 2. Test manuale

Terminale 1:

```bash
cd ~/fotomatrimonio
npm run start:upload
```

Terminale 2:

```bash
cd ~/fotomatrimonio
npm run build
npm run start
```

Verifica:

```bash
curl -s http://127.0.0.1:3001/health
curl -s http://127.0.0.1:3000/api/health
```

---

## 3. HTTPS con nginx

```bash
sudo apt install -y nginx certbot python3-certbot-nginx
sudo certbot --nginx -d matrimonioandreafrancesca.duckdns.org
```

Nel sito nginx (443):

```nginx
client_max_body_size 100m;

# IMPORTANTE: tutto il sito (anche /api/upload) va a Next :3000 — NON a :3001
location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_read_timeout 600s;
    proxy_send_timeout 600s;
}
```

```bash
sudo nginx -t && sudo systemctl reload nginx
```

---

## 4. systemd (avvio automatico)

### Upload API — `/etc/systemd/system/foto-upload.service`

```ini
[Unit]
Description=Foto matrimonio upload API
After=network.target

[Service]
Type=simple
User=andrea
WorkingDirectory=/home/andrea/fotomatrimonio
Environment=NODE_ENV=production
EnvironmentFile=/home/andrea/fotomatrimonio/.env.local
ExecStart=/usr/bin/npm run start:upload
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
```

### Sito Next — `/etc/systemd/system/foto-sito.service`

**Prima del primo avvio:** `cd /home/andrea/fotomatrimonio && npm run build`

```ini
[Unit]
Description=Foto matrimonio Next.js
After=network.target foto-upload.service
Requires=foto-upload.service

[Service]
Type=simple
User=andrea
WorkingDirectory=/home/andrea/fotomatrimonio
Environment=NODE_ENV=production
Environment=PORT=3000
EnvironmentFile=/home/andrea/fotomatrimonio/.env.local
ExecStart=/usr/bin/npm run start
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable foto-upload foto-sito
sudo systemctl start foto-upload foto-sito
sudo systemctl status foto-upload foto-sito
```

Log: `journalctl -u foto-upload -f` / `journalctl -u foto-sito -f`

---

## 5. Aggiornamenti

```bash
cd ~/fotomatrimonio
git pull
rm -rf node_modules .next
npm install
npm run build
sudo systemctl restart foto-upload foto-sito
```

### `npm install` fallisce (ENOTEMPTY / `next: not found`)

`node_modules` è rimasto **a metà**. Non usare solo `rm -rf` se dà errore — usa:

```bash
cd ~/fotomatrimonio
git pull
bash scripts/pi-install.sh
npm run build
sudo systemctl restart foto-sito foto-upload
```

Oppure:

```bash
cd ~/fotomatrimonio
sudo rm -rf node_modules .next
npm cache clean --force
npm install --legacy-peer-deps --no-audit
npm run build
```

Controlla spazio: `df -h ~` (servono **~1–2 GB** liberi).

### Build fallisce (ESLint / TypeScript)

Il progetto salta ESLint in build (`next.config.js`). `node -v` deve essere **≥ 20**.

### `npm warn tar TAR_ENTRY_ERROR` / `Cannot find name 'Object'`

Di solito **`node_modules` corrotto** (SD lenta, install interrotta, due `npm` in parallelo).

```bash
cd ~/fotomatrimonio
git pull
bash scripts/pi-install.sh
npm run build
sudo systemctl restart foto-upload foto-sito
```

Se dopo `pi-install` il build fallisce ancora, usa la **build sul PC** (sotto).

### Alternativa: build sul PC, solo deploy sul Pi

Se il Pi è lento o `npm install` non va:

1. Sul **PC** (Windows): `npm install && npm run build`
2. Copia sul Pi solo **`.next`** (es. `scp -r .next andrea@raspberry:~/fotomatrimonio/`)

Sul Pi:

```bash
cd ~/fotomatrimonio
git pull
bash scripts/pi-install.sh   # oppure: npm install --legacy-peer-deps
# se hai copiato .next dal PC, salta npm run build
sudo systemctl restart foto-upload foto-sito
```

---


## 6. Errore **502 Bad Gateway** (HTML nginx)

nginx non riceve risposta da **Next sulla porta 3000** (non è un errore del token).

```bash
cd ~/fotomatrimonio
bash scripts/check-pi.sh
```

| Controllo | Comando atteso |
|-----------|----------------|
| Upload API | `curl http://127.0.0.1:3001/health` → `{"ok":true,...}` |
| Sito Next | `curl -I http://127.0.0.1:3000/` → HTTP 200 |
| Proxy | `curl http://127.0.0.1:3000/api/ready` → `"ok":true` |

**Riparazione tipica:**

```bash
cd ~/fotomatrimonio
git pull
bash scripts/pi-install.sh
npm run build
sudo systemctl restart foto-upload foto-sito
sudo systemctl status foto-sito foto-upload
```

Se `foto-sito` è **failed**: `journalctl -u foto-sito -n 30` — spesso manca `npm run build` o `.env.local`.

Dal browser: `https://matrimonioandreafrancesca.duckdns.org/api/ready` — se non risponde JSON, Next è giù.

---

## 7. Galleria foto (solo Pi)

Pagina **non linkata** dalla home: `https://matrimonioandreafrancesca.duckdns.org/album`

- Utente predefinito: **admin**
- Password predefinita: **C@gl1@r1** (in `lib/gallery-auth.ts`, modificabile con `GALLERY_USER` / `GALLERY_PASSWORD` in `.env.local`)
- Legge i file da `UPLOAD_DIR` (stessa cartella dell’upload API)
- Su **Vercel** la galleria risponde 404 (solo server locale)

Dopo il deploy: `git pull`, `npm run build:pi`, `sudo systemctl restart foto-sito`.

---

## 8. Altri problemi

| Sintomo | Soluzione |
|---------|-----------|
| `Cannot find module .../server.js` | Usa **`npm run start:upload`**, non `node server.js` |
| 401 + `receivedAuthorization: (mancante)` | Aggiorna `upload-server.js` (trust localhost) e riavvia `foto-upload` — oppure nginx/Next senza `.env.local` |
| 401 token uguale | `EnvironmentFile=.env.local` in **foto-sito** e **foto-upload**; TOKEN = UPLOAD_API_KEY |
| 413 | Aumenta `client_max_body_size` in nginx |
