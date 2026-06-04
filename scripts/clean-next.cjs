/**
 * Rimuove .next prima del build (evita ENOTEMPTY su Raspberry).
 */
const fs = require("fs");
const path = require("path");

const nextDir = path.join(__dirname, "..", ".next");

if (!fs.existsSync(nextDir)) {
  process.exit(0);
}

try {
  fs.rmSync(nextDir, {
    recursive: true,
    force: true,
    maxRetries: 10,
    retryDelay: 200,
  });
} catch (err) {
  console.error("Impossibile rimuovere .next:", err.message);
  console.error("Sul Pi: sudo systemctl stop foto-sito foto-upload && rm -rf .next");
  process.exit(1);
}
