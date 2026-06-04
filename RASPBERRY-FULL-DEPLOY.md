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
npm install
```

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
MAX_FILE_MB=25
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
npm install
npm run build
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
npm install
npm run build
sudo systemctl restart foto-upload foto-sito
sudo systemctl status foto-sito foto-upload
```

Se `foto-sito` è **failed**: `journalctl -u foto-sito -n 30` — spesso manca `npm run build` o `.env.local`.

Dal browser: `https://matrimonioandreafrancesca.duckdns.org/api/ready` — se non risponde JSON, Next è giù.

---

## 7. Altri problemi

| Sintomo | Soluzione |
|---------|-----------|
| `Cannot find module .../server.js` | Usa **`npm run start:upload`**, non `node server.js` |
| 401 + `receivedAuthorization: (mancante)` | Aggiorna `upload-server.js` (trust localhost) e riavvia `foto-upload` — oppure nginx/Next senza `.env.local` |
| 401 token uguale | `EnvironmentFile=.env.local` in **foto-sito** e **foto-upload**; TOKEN = UPLOAD_API_KEY |
| 413 | Aumenta `client_max_body_size` in nginx |
