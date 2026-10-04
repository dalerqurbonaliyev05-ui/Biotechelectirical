# Supabase: baza, qoidalar, server funksiyalari

## Migratsiyalar (tartib bilan)
1. `0001_schema.sql`: jadvallar, rollar, RLS qoidalari, storage bucketlari
2. `0002_activation_helpers.sql`: faollashtirish urinishlarini atomar hisoblash
3. `0003_harden_grants.sql`: kirmagan (anon) foydalanuvchiga huquqlarni olib tashlash
4. `0004_storage_limits_approval_hash.sql`: rasm cheklovlari, tasdiq muhri (`data_hash`), sessiyalarni bekor qilish

## Server funksiyalari (`functions/`)
| Funksiya | JWT | Kim chaqiradi |
|---|---|---|
| `activate-student` | yo'q (kod bilan) | talaba, hali kirmagan |
| `import-students` | ha | admin, amaliyot rahbari |
| `manage-users` | ha | admin (xodim yaratish, faolsizlantirish); amaliyot rahbari (faqat talaba parolini tiklash) |

`_shared/logic.ts`: toza mantiq (Node'da sinaladi): `node --test supabase/tests/logic.test.mjs`.

## Muhim
- `service_role` kaliti faqat funksiyalar ichida (avtomatik). Brauzerga hech qachon berilmaydi.
- Kirish: talaba `HEMIS_ID@students.res.invalid`, xodim `login@staff.res.invalid` (ro'yxatdan o'tkazib bo'lmaydigan domen: parolni "email orqali tiklash" orqali hisob egallab bo'lmaydi). Foydalanuvchi faqat login yozadi.
- Talabalar HEMIS ro'yxatidan (CSV) import qilinadi, har biriga bir martalik faollashtirish kodi beriladi. HEMIS API ochilganda faqat import manbai almashtiriladi.

## Uy ovqatlari bozori (apps/ + admin/)
Migratsiyalar: `0005_uyovqat_schema.sql` (jadvallar), `0006_uyovqat_functions.sql` (kuryer biriktirish, buyurtma/holat RPC'lari, daromad va bonus triggerlari),
`0007_uyovqat_rls.sql` (RLS, Storage, Realtime). Jadvallar mavjud `profiles`/`settings` bilan to'qnashmaydi (`uy_profiles`, `uy_settings`).
Ilova foydalanuvchisi `user_metadata.app = 'uyovqat'` bilan ro'yxatdan o'tadi; boshqalarga profil yaratilmaydi.

**Admin berish (qo'lda, SQL Editor'da):** `update public.uy_profiles set role = 'admin' where id = '<auth user id>';`

**Lokal sinov** (Postgres 14+; Supabase kerak emas):
```
createdb t1 && psql -d t1 -f supabase/tests/uyovqat_stub.sql
for f in supabase/migrations/000[567]_uyovqat_*.sql; do psql -v ON_ERROR_STOP=1 -d t1 -f $f; done
psql -d t1 -f supabase/tests/uyovqat_flow.sql
```
Sozlamalar (`uy_settings`: yetkazish narxi, platforma ulushi, kuryer radiusi) va bonus qoidasi (`bonus_rules`) admin paneldan o'zgartiriladi.
