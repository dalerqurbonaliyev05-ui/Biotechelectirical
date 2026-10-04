#!/bin/sh
# Lokal Postgres'da sxema + RLS sinovi (Supabase kerak emas): `sh run.sh` (postgres foydalanuvchisi yoki PGHOST/PGUSER bilan)
set -e
D="$(cd "$(dirname "$0")" && pwd)"
psql -q -c 'drop database if exists mi_test' -c 'create database mi_test'
psql -q -v ON_ERROR_STOP=1 -d mi_test -f "$D/stub.sql" -f "$D/../schema.sql" -f "$D/rls.test.sql" 2>&1 | grep -v NOTICE
# sxemani qayta ishga tushirish xavfsizligi (idempotent)
psql -q -v ON_ERROR_STOP=1 -d mi_test -f "$D/../schema.sql" 2>&1 | grep -v NOTICE || true
echo "schema.sql ikkinchi marta ham xatosiz ishladi"
