#!/bin/sh
# .env uchun tasodifiy maxfiy qiymatlarni chiqaradi:  ./scripts/gen-secrets.sh >> .env
set -e
r() { head -c "$1" /dev/urandom | od -An -tx1 | tr -d ' \n'; }
echo "POSTGRES_PASSWORD=$(r 24)"
echo "APP_DB_PASSWORD=$(r 24)"
echo "JWT_SECRET=$(r 32)"
echo "ACTIVATION_PEPPER=$(r 32)"
