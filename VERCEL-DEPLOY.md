# Fix Vercel: "No Output Directory named public"

Questo progetto è **Next.js** (con API `/api/upload`).  
**Non** è un sito statico: la build **non** deve usare Output Directory = `public`.

## Impostazioni corrette su Vercel

1. Apri il progetto su [vercel.com](https://vercel.com)
2. **Settings** → **Build and Deployment**
3. **Framework Preset** → **Next.js**
4. **Output Directory**:
   - Se vedi `public` → **cancella** il valore
   - Disattiva **Override** se è attivo
   - Il campo deve essere **vuoto** (default Next.js)
5. **Build Command** → vuoto o `npm run build` (non `vite build`, ecc.)
6. **Install Command** → vuoto o `npm install`
7. **Root Directory** → vuoto (root del repo)
8. **Deployments** → ultimo deploy → **⋯** → **Redeploy**

## Variabili d'ambiente (obbligatorie)

Il file `.env.local` **non** va su GitHub. Su Vercel vanno create a mano:

**Project → Settings → Environment Variables → Add**

| Nome | Valore | Ambiente |
|------|--------|----------|
| `NEXT_PUBLIC_API_BASE_URL` | `http://fotoonano.duckdns.org` | Production, Preview, Development |
| `UPLOAD_API_KEY` | **identico** a `TOKEN` nel `.env` del Raspberry (anche se è `cambia-questo-token`) | Production, Preview, Development |

Dopo ogni modifica alle variabili: **Deployments → Redeploy**.

**Importante:** spunta **Production** e **Preview** (non solo *Development* — quello vale solo per `vercel dev` in cloud).

### Verifica dopo il deploy

Apri nel browser (sostituisci con il tuo dominio):

`https://TUO-DOMINIO.vercel.app/api/config-status`

Risposta attesa se è tutto ok:

```json
"uploadApiKey": { "ok": true, "length": 12, "uploadEnvDefined": true }
```

Se `ok: false` e `uploadEnvDefined: false`, la variabile **non è collegata** a questo deploy (nome sbagliato, ambiente sbagliato, o progetto Vercel diverso dal repo).

Se `problem: "placeholder"`, hai ancora il testo da `.env.example` — metti il TOKEN reale del Pi.

Se vedi l’errore upload ma `config-status` dice `ok: true`, il problema è altrove (401 sul Pi, NGINX, ecc.).

## Se l'errore resta

1. **Elimina** il progetto su Vercel
2. **Add New** → Import [matrimoniofoto](https://github.com/onanoandrea-hub/matrimoniofoto)
3. Verifica che rilevi **Next.js** automaticamente
4. **Non** impostare Output Directory manualmente
5. Deploy

## Cosa NON fare

- Non impostare `outputDirectory: "public"` in `vercel.json`
- Non usare Framework Preset **Other** con output `public`
- La cartella `public/` nel repo è solo per asset statici (favicon), non è l'output della build
