#!/bin/bash
# Installazione pulita su Raspberry — dalla root del repo:
#   bash scripts/pi-install.sh
#   npm run build
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "=== Spazio disco ==="
df -h "$ROOT" | tail -1

echo "=== Ferma servizi (evita file in uso) ==="
sudo systemctl stop foto-sito foto-upload 2>/dev/null || true

echo "=== Rimuovo node_modules e .next ==="
if [ -d node_modules ]; then
  chmod -R u+w node_modules 2>/dev/null || true
  rm -rf node_modules 2>/dev/null || sudo rm -rf node_modules
fi
rm -rf .next

echo "=== Pulizia cache npm ==="
npm cache clean --force

echo "=== Node ==="
node -v
npm -v

echo "=== npm install (solo runtime + TypeScript, niente ESLint) ==="
export NODE_OPTIONS="${NODE_OPTIONS:---max-old-space-size=768}"
npm install --no-audit --no-fund --legacy-peer-deps

for f in node_modules/.bin/next node_modules/typescript/lib/typescript.js; do
  if [ ! -e "$f" ]; then
    echo "ERRORE: manca $f — installazione incompleta (spazio disco / SD card?)."
    exit 1
  fi
done

echo "=== Verifica TypeScript ==="
node -e "require('typescript'); console.log('typescript OK')"

echo "=== Installazione OK. Esegui: npm run build:pi ==="
