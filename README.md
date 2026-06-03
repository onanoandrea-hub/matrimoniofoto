# Foto Matrimonio — frontend Next.js

Sito minimale per caricare foto degli invitati.

- **Vercel:** frontend HTTPS + proxy `/api/upload` (limite ~4,5 MB per foto → compressione automatica).
- **Tutto sul Raspberry:** guida completa → **[RASPBERRY-FULL-DEPLOY.md](./RASPBERRY-FULL-DEPLOY.md)** (niente limite Vercel).

In entrambi i casi le chiamate al backend passano da **route API Next.js** (`/api/upload`, `/api/health`) salvo configurazione nginx avanzata.

## Architettura

```
Browser (HTTPS, Vercel)
    → POST /api/upload  (stesso dominio)
        → Route Handler Next.js (server)
            → POST http://matrimonioandreafrancesca.duckdns.org/upload
```

In sviluppo locale il flusso è identico: il browser parla sempre con `/api/upload`.  
Il Bearer (`UPLOAD_API_KEY`) viene aggiunto **solo** dal route handler server-side, mai dal browser.

## Requisiti

- **Node.js 20 LTS o superiore** (Next.js 15 non supporta 18.15.x)
- npm

### Aggiornare Node su Windows

Controlla la versione attiva:

```powershell
node -v
```

Se vedi `v18.15.0` (o altro sotto 18.18), aggiorna con uno di questi metodi:

**Opzione A — installer (più semplice)**  
Scarica e installa [Node.js 20 LTS](https://nodejs.org/en/download) (o 22 LTS). Chiudi e riapri Cursor/terminale, poi verifica:

```powershell
node -v
npm -v
```

**Opzione B — winget**

```powershell
winget install OpenJS.NodeJS.LTS
```

Riapri il terminale dopo l’installazione.

**Opzione C — nvm-windows** (se usi più versioni Node)

```powershell
nvm install 20
nvm use 20
node -v
```

Il file `.nvmrc` nel progetto indica la versione consigliata (`20`).

## Avvio locale

```bash
cd fotoMatrimonioSito
npm install
cp .env.example .env.local
```

Due terminali (stessa cartella):

```bash
# Terminale 1 — API upload (porta 3001)
npm run start:upload

# Terminale 2 — sito Next (porta 3000)
npm run dev
```

Apri [http://localhost:3000](http://localhost:3000).

Verifica proxy health: [http://localhost:3000/api/health](http://localhost:3000/api/health) — deve restituire lo stesso JSON del backend (`{"ok":true,...}`).

## Variabili ambiente

| Variabile | Dove | Descrizione |
|-----------|------|-------------|
| `UPLOAD_API_KEY` | `.env.local` | Stesso valore di `TOKEN`; usato dal proxy Next |
| `TOKEN` | `.env.local` | Stesso valore di `UPLOAD_API_KEY`; usato da `upload-server.js` |
| `UPLOAD_PORT` | `.env.local` | Porta API upload (default **3001**) |
| `UPLOAD_DIR` | `.env.local` | Cartella foto sul disco (default `./uploads`) |
| `NEXT_PUBLIC_API_BASE_URL` | `.env.local` / Vercel | Su Vercel: URL del Pi. Sul Pi: opzionale (proxy usa `127.0.0.1:UPLOAD_PORT`) |

Il proxy invia esattamente: `Authorization: Bearer <UPLOAD_API_KEY>` (come richiesto da Express: `auth !== \`Bearer ${TOKEN}\``).

### Errore `{"error":"unauthorized"}`

Il proxy invia già `Authorization: Bearer <UPLOAD_API_KEY>`. Se vedi ancora 401:

1. **Token reale sul Pi** — `test123` nell’esempio è solo un placeholder. Sul Raspberry:

   ```bash
   grep -E 'UPLOAD|TOKEN|SECRET|API' .env
   ```

   `UPLOAD_API_KEY` in `.env.local` deve essere **identico** a `TOKEN` nel `.env` del Raspberry.

2. **Diagnostica locale** (con `npm run dev`):

   [http://localhost:3000/api/auth-check](http://localhost:3000/api/auth-check)

   Mostra se la chiave è caricata e cosa risponde il backend (senza esporre il token intero).

3. **Test sul Raspberry** (distingue Express vs NGINX):

   ```bash
   # diretto a Express (dovrebbe funzionare se il token è giusto)
   curl -s -X POST http://127.0.0.1:3001/upload \
     -H "Authorization: Bearer IL_TUO_TOKEN" \
     -F "files=@/percorso/foto.jpg"

   # tramite DuckDNS (come fa Next/Vercel)
   curl -s -X POST http://matrimonioandreafrancesca.duckdns.org/upload \
     -H "Authorization: Bearer IL_TUO_TOKEN" \
     -F "files=@/percorso/foto.jpg"
   ```

   Se il primo OK e il secondo 401 → NGINX non inoltra `Authorization`. Nel `location` aggiungi:

   ```nginx
   proxy_set_header Authorization $http_authorization;
   proxy_pass_request_headers on;
   ```

4. Riavvia `npm run dev` dopo ogni modifica a `.env.local`.
5. Su Vercel: `UPLOAD_API_KEY` nelle Environment Variables (mai `NEXT_PUBLIC_`).

Su **Vercel** → Project → Settings → Environment Variables → aggiungi `NEXT_PUBLIC_API_BASE_URL` per Production, Preview e Development.

## Campi FormData inviati al backend

Il proxy inoltra tutti i campi ricevuti. Il frontend invia:

- `files` — una entry per ogni immagine (ripetuto)
- `name` — opzionale
- `message` — opzionale

### Backend upload (Express)

Il file è **`upload-server.js`** nella root del repo. Avvio: `npm run start:upload`.

## Push su GitHub

```bash
git init
git add .
git commit -m "Initial commit: upload foto matrimonio Next.js"
git branch -M main
git remote add origin https://github.com/TUO_USER/TUO_REPO.git
git push -u origin main
```

## Deploy su Vercel

1. Vai su [vercel.com](https://vercel.com) → **Add New Project**
2. Importa [onanoandrea-hub/matrimoniofoto](https://github.com/onanoandrea-hub/matrimoniofoto)
3. **Framework Preset: Next.js** (non “Other” e non sito statico)
4. **Output Directory**: lascia **vuoto** (default). Non impostare `public` — quella cartella è solo per asset statici, non è l’output della build Next.js
5. Variabili d’ambiente:
   - `NEXT_PUBLIC_API_BASE_URL` = `http://matrimonioandreafrancesca.duckdns.org`
   - `UPLOAD_API_KEY` = stesso `TOKEN` del Raspberry
6. **Deploy**

Il repo include `vercel.json` con `"framework": "nextjs"` per forzare il rilevamento corretto.

### Errore “No Output Directory named public”

Vercel sta trattando il progetto come **sito statico** (output `public`). Per Next.js l’**Output Directory deve essere vuota**.

Guida passo-passo: **[VERCEL-DEPLOY.md](./VERCEL-DEPLOY.md)**

In sintesi: Settings → Build and Deployment → Framework **Next.js** → **rimuovi** `public` da Output Directory → Redeploy.

Ogni push su `main` genera un deploy automatico.

## Quando passare al backend HTTPS

Quando configurerai TLS su DuckDNS / NGINX (`https://matrimonioandreafrancesca.duckdns.org`), potrai:

- aggiornare `NEXT_PUBLIC_API_BASE_URL` con `https://...`
- oppure continuare a usare il proxy (consigliato: nasconde l’URL del Raspberry e evita CORS)

## Script

| Comando | Azione |
|---------|--------|
| `npm run dev` | Sviluppo |
| `npm run build` | Build produzione |
| `npm run start` | Server produzione locale |
| `npm run lint` | ESLint |
