#!/usr/bin/env bash
# Migratsiyalar + seed + RLS testlarini toza PostgreSQL bazasida ishga tushiradi.
#   PGURL=postgresql://postgres:postgres@localhost:5432  bash scripts/test-rls.sh
# supabase/tests/NN_*.sql (NN ≥ 10) fayllari RAISE EXCEPTION bilan yiqilsa, skript to'xtaydi.
set -euo pipefail
cd "$(dirname "$0")/.."

BASE="${PGURL:-postgresql://postgres:postgres@localhost:5432}"
DB="smartedu_test"
run() { psql -X -q -v ON_ERROR_STOP=1 -o /dev/null "$BASE/$1" "${@:2}" 2>&1; }

run postgres -c "drop database if exists $DB with (force)" -c "create database $DB" >/dev/null
run $DB -f supabase/tests/00_supabase_stub.sql | grep -v -e wal_level -e '^HINT' || true
for f in supabase/migrations/*.sql; do
  echo "→ migratsiya: $(basename "$f")"
  run $DB -f "$f" || { echo "✘ migratsiya xato: $f"; exit 1; }
done
echo "→ seed.sql"
run $DB -f supabase/seed.sql || { echo "✘ seed xato"; exit 1; }
for f in supabase/tests/[1-9]*.sql; do
  [ -e "$f" ] || continue
  echo "→ test: $(basename "$f")"
  if ! out=$(run $DB -f "$f"); then echo "$out"; echo "✘ $f muvaffaqiyatsiz"; exit 1; fi
  echo "$out" | grep -o 'ok  - .*' | sed 's/^/   /'
done
echo "✔ Barcha SQL testlar o'tdi"
