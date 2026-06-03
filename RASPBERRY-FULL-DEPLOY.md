# Tutto sul Raspberry (sito + upload)

Guida per **non usare Vercel**: Next.js e Express girano sul Pi dietro **nginx + HTTPS**.  
Niente limite 4,5 MB di Vercel; restano solo i limiti che imposti tu (multer, nginx, disco, rete).

## Architettura

```
Browser (HTTPS)
    → nginx :443
        → Next.js :3000  (pagina + /api/upload proxy)
            → Express :3001  (/upload, /health)
```

Il browser vede un solo dominio (`https://matrimonioandreafrancesca.duckdns.org`).  
Il proxy `/api/upload` gira **sul Pi**, non su Vercel → upload fino a `MAX_FILE_MB` (default 25 MB/foto).

---

## 0. Cosa ti serve

- Raspberry con **Raspberry Pi OS** (o Debian)
- **Node.js 20+** sul Pi
- Dominio **DuckDNS** già puntato al Pi
- **nginx** installato
- Porte **80** e **443** inoltrate dal router al Pi
- Spazio disco per le foto (consigliato **32+ GB** liberi il giorno dell’evento)

---

## 1. HTTPS (obbligatorio)

Senza HTTPS i telefoni possono bloccare il sito o le API.

```bash
sudo apt update
sudo apt install -y nginx certbot python3-certbot-nginx
sudo certbot --nginx -d matrimonioandreafrancesca.duckdns.org
```

Segui il wizard. Certbot configura nginx per HTTPS.

---

## 2. Backend Express (porta 3001)

### 2.1 Cartelle sul Pi

Esempio (adatta i path):

```bash
mkdir -p ~/fotomatrimonio
cd ~/fotomatrimonio
```

Copia sul Pi la cartella `backend/` del repo (git clone o `scp`):

```bash
# dal PC, esempio:
scp -r backend/ pi@IP_DEL_PI:~/fotomatrimonio/backend/
```

### 2.2 File `.env` del backend

`~/fotomatrimonio/backend/.env`:

```env
PORT=3001
TOKEN=cambia-questo-token
UPLOAD_DIR=/home/pi/fotomatrimonio/uploads
MAX_FILES=50
MAX_FILE_MB=25
```

Crea la cartella upload:

```bash
mkdir -p /home/pi/fotomatrimonio/uploads
```

### 2.3 Installazione e test

```bash
cd ~/fotomatrimonio/backend
npm install
node server.js
```

In un altro terminale:

```bash
curl -s http://127.0.0.1:3001/health
curl -s -X POST http://127.0.0.1:3001/upload \
  -H "Authorization: Bearer cambia-questo-token" \
  -F "files=@/percorso/foto.jpg"
```

Se OK, ferma con Ctrl+C e passa al servizio systemd (sezione 5).

---

## 3. Frontend Next.js (porta 3000)

### 3.1 Codice sul Pi

```bash
cd ~/fotomatrimonio
git clone https://github.com/onanoandrea-hub/matrimoniofoto.git sito
cd sito
```

Oppure copia l’intero progetto da PC con `scp` / `rsync`.

### 3.2 `.env.local` sul Pi

`~/fotomatrimonio/sito/.env.local`:

```env
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:3001
UPLOAD_API_KEY=cambia-questo-token
```

- `UPLOAD_API_KEY` = **stesso** `TOKEN` del backend  
- `127.0.0.1:3001` perché il proxy Next parla al Express **in locale** (non esce da internet)

### 3.3 Build e avvio

Sul Pi (la build può richiedere diversi minuti):

```bash
cd ~/fotomatrimonio/sito
npm install
npm run build
npm run start
```

Prova: `curl -s http://127.0.0.1:3000/api/health`

**Alternativa:** fai `npm run build` sul PC Windows e copia solo `.next`, `package.json`, `node_modules` (più veloce sul Pi vecchio).

---

## 4. nginx — un solo dominio

Modifica il sito creato da certbot, es.  
`/etc/nginx/sites-available/matrimonioandreafrancesca` (nome esempio).

```nginx
server {
    listen 443 ssl;
    server_name matrimonioandreafrancesca.duckdns.org;

    # certbot ha già aggiunto ssl_certificate ...

    # Upload grandi (allinea a MAX_FILE_MB nel .env del backend)
    client_max_body_size 30m;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

server {
    listen 80;
    server_name matrimonioandreafrancesca.duckdns.org;
    return 301 https://$host$request_uri;
}
```

Test e reload:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

Apri da telefono: **https://matrimonioandreafrancesca.duckdns.org**

---

## 5. Servizi che ripartono al boot (systemd)

### Backend — `/etc/systemd/system/foto-upload.service`

```ini
[Unit]
Description=Foto matrimonio upload API
After=network.target

[Service]
Type=simple
User=pi
WorkingDirectory=/home/pi/fotomatrimonio/backend
Environment=NODE_ENV=production
ExecStart=/usr/bin/node server.js
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
```

### Frontend — `/etc/systemd/system/foto-sito.service`

```ini
[Unit]
Description=Foto matrimonio Next.js
After=network.target foto-upload.service
Requires=foto-upload.service

[Service]
Type=simple
User=pi
WorkingDirectory=/home/pi/fotomatrimonio/sito
Environment=NODE_ENV=production
Environment=PORT=3000
ExecStart=/usr/bin/npm run start
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Attiva:

```bash
sudo systemctl daemon-reload
sudo systemctl enable foto-upload foto-sito
sudo systemctl start foto-upload foto-sito
sudo systemctl status foto-upload foto-sito
```

Log:

```bash
journalctl -u foto-upload -f
journalctl -u foto-sito -f
```

---

## 6. Limiti che puoi alzare

| Dove | Cosa |
|------|------|
| `backend/.env` | `MAX_FILE_MB=50` (esempio) |
| nginx | `client_max_body_size 55m;` (≥ MAX_FILE_MB) |
| Disco | `df -h` sulla cartella `UPLOAD_DIR` |

Non serve più la compressione aggressiva per Vercel; puoi lasciarla per risparmiare banda upload di casa.

---

## 7. Aggiornare il sito dopo modifiche Git

```bash
cd ~/fotomatrimonio/sito
git pull
npm install
npm run build
sudo systemctl restart foto-sito
```

Backend:

```bash
cd ~/fotomatrimonio/backend
# copia nuovo server.js se cambiato
sudo systemctl restart foto-upload
```

---

## 8. Vercel

Puoi **disattivare** il progetto su Vercel o lasciare il dominio solo sul Pi.  
Gli invitati useranno solo `https://matrimonioandreafrancesca.duckdns.org`.

---

## 9. Checklist giorno matrimonio

- [ ] `systemctl status foto-upload foto-sito nginx` tutti **active**
- [ ] Test upload da **4G** (non solo Wi‑Fi di casa)
- [ ] `df -h` — spazio disco sufficiente
- [ ] Token non è un placeholder se hai abilitato controlli nel codice
- [ ] Router: porte 80/443 inoltrate al Pi

---

## 10. Problemi frequenti

| Sintomo | Causa probabile |
|---------|------------------|
| 502 Bad Gateway | Next o Express non in ascolto → `systemctl status` |
| 413 Request Entity Too Large | `client_max_body_size` nginx troppo basso |
| 401 unauthorized | `TOKEN` ≠ `UPLOAD_API_KEY` o header non arriva |
| `file_too_large` | `MAX_FILE_MB` multer |
| Sito lento | Troppi upload in parallelo + upload ADSL limitato |

---

## Variante avanzata (opzionale)

nginx può mandare **`/upload` diretto a Express** (porta 3001) e il resto a Next, con upload dal browser senza proxy. Richiede piccole modifiche al frontend (`lib/upload-client.ts`). La guida sopra è la via **più semplice** senza cambiare codice.
