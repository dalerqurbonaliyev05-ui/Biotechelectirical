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
