#!/bin/bash
# Build sicuro su Raspberry: ferma servizi, pulisce .next, compila.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "=== Ferma servizi ==="
sudo systemctl stop foto-sito foto-upload 2>/dev/null || true

echo "=== Pulizia .next ==="
node scripts/clean-next.cjs
if [ -d .next ]; then
  chmod -R u+w .next 2>/dev/null || true
  rm -rf .next 2>/dev/null || sudo rm -rf .next
fi

echo "=== Build ==="
export NODE_OPTIONS="${NODE_OPTIONS:---max-old-space-size=768}"
npm run build

echo "=== OK. Riavvia: sudo systemctl start foto-upload foto-sito ==="
