#!/bin/sh
# Zaxira nusxa: baza (pg_dump) + rasm fayllari. Natija: backups/amaliyot-YYYYMMDD-HHMMSS/
# Foydalanish (loyiha papkasida):  ./scripts/backup.sh [papka]     Muntazam ishlatish: cron (docs/ADMIN.md)
set -eu
cd "$(dirname "$0")/.."
OUT="${1:-backups}/amaliyot-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$OUT"
[ -f .env ] && set -a && . ./.env && set +a
DC="docker compose"
$DC exec -T db pg_dump -U "${POSTGRES_USER:-postgres}" -d "${POSTGRES_DB:-amaliyot}" --format=custom --no-owner > "$OUT/db.dump"
$DC exec -T app tar -C /data -cf - . > "$OUT/files.tar"
( cd "$OUT" && sha256sum db.dump files.tar > SHA256SUMS )
echo "Zaxira tayyor: $OUT"
echo "Eslatma: zaxirani boshqa kompyuter/diskka ham nusxalang. U maxfiy ma'lumotlarni (parol xeshlari, talaba ma'lumotlari) o'z ichiga oladi."
