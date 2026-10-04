#!/usr/bin/env bash
# Admin panelni saytga (fizika/admin/) joylash uchun nusxalaydi. Avval: node build.mjs (fizika-src ichida)
set -euo pipefail
cd "$(dirname "$0")/.."
D=../fizika/admin
rm -rf "$D" && mkdir -p "$D"
cp dist/admin.html "$D/index.html"
cp dist/admin.js dist/admin.css dist/config.js dist/icon-192.png "$D/"
cp -r dist/data dist/fig "$D/"
echo "admin panel: $D"
