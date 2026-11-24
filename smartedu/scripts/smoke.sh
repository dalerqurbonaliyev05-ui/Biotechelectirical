#!/usr/bin/env bash
# Smoke test: build qilingan serverni ishga tushirib, asosiy yo'llarni tekshiradi.
# Supabase'ga ulanish SHART EMAS (soxta manzil; kirmagan foydalanuvchi uchun tarmoq so'rovi bo'lmaydi).
set -euo pipefail
cd "$(dirname "$0")/.."
PORT="${PORT:-3107}"

check() { # nom, kutilgan_kod, url, [qo'shimcha curl argumentlari]
  local name="$1" want="$2" url="$3"; shift 3
  local got; got=$(curl -s -o /dev/null -w '%{http_code}' "$@" "http://127.0.0.1:$PORT$url")
  if [ "$got" != "$want" ]; then echo "✘ $name: kutilgan $want, olingan $got"; exit 1; fi
  echo "✔ $name ($got)"
}

NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:9 NEXT_PUBLIC_SUPABASE_ANON_KEY=smoke-test-anon-key-000 \
  SUPABASE_SERVICE_ROLE_KEY=smoke LAB_SHARED_SECRET=smoke-lab-secret-0123456789 npx next start -p "$PORT" >/tmp/smartedu-smoke.log 2>&1 &
PID=$!
trap 'kill $PID 2>/dev/null || true' EXIT
for _ in $(seq 1 30); do curl -s -o /dev/null "http://127.0.0.1:$PORT/login" && break; sleep 1; done

check "bosh sahifa ochiq" 200 /
check "login sahifasi ochiq" 200 /login
check "kirmagan: /admin → login" 307 /admin
check "kirmagan: /student → login" 307 /student
check "kirmagan: API → 401" 401 /api/admin/students/import -X POST
check "kirmagan: /teacher/questions → login" 307 /teacher/questions
check "kirmagan: urinish API → 401" 401 /api/attempts/00000000-0000-0000-0000-000000000001
check "kirmagan: baholash API → 401" 401 /api/answers/00000000-0000-0000-0000-000000000001/grade -X POST
check "kirmagan: natija sahifasi → login" 307 /student/results/00000000-0000-0000-0000-000000000001
check "kirmagan: eksport → 401" 401 "/api/assessments/00000000-0000-0000-0000-000000000001/export?format=csv"
check "kirmagan: /live → login" 307 /live
check "kirmagan: qo'shilish API → 401" 401 /api/live/join -X POST
check "kirmagan: jonli javob API → 401" 401 /api/live/answer -X POST
check "kirmagan: savol boshqaruvi → 401" 401 /api/sessions/00000000-0000-0000-0000-000000000001/question -X POST
check "laboratoriya: imzosiz → 401" 401 /api/lab/submit -X POST -d '{}'
check "login: noto'g'ri JSON → 400" 400 /api/auth/login -X POST -H 'content-type: application/json' -d 'not-json'
echo "✔ smoke test o'tdi"
