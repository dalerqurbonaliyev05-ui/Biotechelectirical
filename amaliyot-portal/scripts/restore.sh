#!/bin/sh
# Zaxiradan tiklash:  ./scripts/restore.sh backups/amaliyot-YYYYMMDD-HHMMSS
# DIQQAT: hozirgi baza va fayllar zaxiradagi holatga almashtiriladi.
set -eu
cd "$(dirname "$0")/.."
SRC="${1:?Zaxira papkasini ko'rsating}"
[ -f "$SRC/db.dump" ] && [ -f "$SRC/files.tar" ] || { echo "Papkada db.dump va files.tar bo'lishi kerak"; exit 1; }
( cd "$SRC" && sha256sum -c SHA256SUMS )
printf "Hozirgi ma'lumotlar o'chib, zaxiradagisi tiklanadi. Davom etilsinmi? (ha/yo'q): "
read -r a; [ "$a" = "ha" ] || { echo "Bekor qilindi"; exit 1; }
[ -f .env ] && set -a && . ./.env && set +a
DC="docker compose"
$DC stop app
$DC exec -T db pg_restore -U "${POSTGRES_USER:-postgres}" -d "${POSTGRES_DB:-amaliyot}" --clean --if-exists --no-owner < "$SRC/db.dump"
$DC run --rm --no-deps -T --entrypoint sh app -c 'rm -rf /data/* /data/.[!.]* 2>/dev/null; tar -C /data -xf -' < "$SRC/files.tar"
$DC up -d app
echo "Tiklandi."
