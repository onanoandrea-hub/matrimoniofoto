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

## Variabili d'ambiente

| Nome | Valore |
|------|--------|
| `NEXT_PUBLIC_API_BASE_URL` | `http://fotoonano.duckdns.org` |
| `UPLOAD_API_KEY` | stesso `TOKEN` del Raspberry |

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
