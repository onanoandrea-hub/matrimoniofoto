#!/bin/bash
# Installazione pulita su Raspberry — esegui dalla root del repo:
#   bash scripts/pi-install.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "=== Spazio disco ==="
df -h "$ROOT" | tail -1

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

echo "=== npm install (può richiedere alcuni minuti sul Pi) ==="
npm install --no-audit --no-fund --legacy-peer-deps

if [ ! -x node_modules/.bin/next ]; then
  echo "ERRORE: next non installato. Controlla spazio disco e riprova."
  exit 1
fi

echo "=== OK. Ora: npm run build ==="
