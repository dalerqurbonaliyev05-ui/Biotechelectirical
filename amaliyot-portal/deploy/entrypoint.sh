#!/bin/sh
# Ishga tushirishda: avval baza migratsiyalari, keyin server.
set -e
cd /app/server
node src/migrate-cli.js
exec node src/index.js
