# Deploy sul Raspberry (una sola cartella)

Tutto il progetto vive in **un’unica directory**. Due processi Node dalla stessa root:

| Comando | Cosa | Porta |
|---------|------|-------|
| `npm run start:upload` | API upload (`upload-server.js`) | **3001** |
| `npm run build` + `npm run start` | Sito Next.js | **3000** |

nginx (HTTPS) inoltra il traffico solo a Next (:3000). Next parla con l’upload API su **127.0.0.1:3001** (nessun problema nginx / Authorization).

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
ExecStart=/usr/bin/npm run start:upload
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
```

### Sito Next — `/etc/systemd/system/foto-sito.service`

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

## 6. Problemi frequenti

| Sintomo | Soluzione |
|---------|-----------|
| `Cannot find module .../server.js` | Usa **`npm run start:upload`**, non `node server.js` |
| 502 Bad Gateway | `systemctl status foto-sito foto-upload` — Next o upload non in esecuzione |
| 401 token uguale | Riavvia entrambi i servizi; controlla `.env.local` (TOKEN = UPLOAD_API_KEY) |
| 413 | Aumenta `client_max_body_size` in nginx |

Diagnostica: `https://tuodominio/api/config-status` e `http://localhost:3000/api/auth-check` (solo dev).
