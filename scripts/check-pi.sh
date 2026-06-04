#!/bin/bash
# Esegui sul Raspberry: bash scripts/check-pi.sh
set -e
echo "=== Porte in ascolto ==="
ss -tlnp | grep -E ':3000|:3001' || echo "NESSUNA porta 3000/3001 in ascolto!"

echo ""
echo "=== systemd ==="
systemctl is-active foto-sito foto-upload nginx 2>/dev/null || true

echo ""
echo "=== Health locale ==="
echo -n "Upload :3001 → "
curl -sf http://127.0.0.1:3001/health || echo "FALLITO"
echo ""
echo -n "Next   :3000 → "
curl -sf -o /dev/null -w "HTTP %{http_code}\n" http://127.0.0.1:3000/ || echo "FALLITO"
echo -n "Proxy  :3000/api/health → "
curl -sf http://127.0.0.1:3000/api/health || echo "FALLITO"
echo -n "Ready  :3000/api/ready → "
curl -sf http://127.0.0.1:3000/api/ready || echo "FALLITO"

echo ""
echo "=== Ultimi log (se esistono i servizi) ==="
journalctl -u foto-sito -n 8 --no-pager 2>/dev/null || true
journalctl -u foto-upload -n 5 --no-pager 2>/dev/null || true
