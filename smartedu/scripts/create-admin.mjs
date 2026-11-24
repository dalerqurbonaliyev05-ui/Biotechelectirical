#!/usr/bin/env node
// Birinchi administratorni yaratadi (productionda seed.sql ISHLATILMAYDI).
//   node scripts/create-admin.mjs admin@kafedra.uz "Familiya Ism Sharif"
// .env.local dan NEXT_PUBLIC_SUPABASE_URL va SUPABASE_SERVICE_ROLE_KEY o'qiladi.
// Vaqtinchalik parol FAQAT SHU YERDA bir marta chop etiladi; birinchi kirishda almashtirish talab qilinadi.
import { createClient } from '@supabase/supabase-js'
import { randomInt } from 'node:crypto'

try {
  process.loadEnvFile('.env.local')
} catch {
  /* muhit o'zgaruvchilari boshqacha berilgan bo'lishi mumkin */
}

const [email, ...nameParts] = process.argv.slice(2)
const fullName = nameParts.join(' ').trim()
const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || fullName.length < 3) {
  console.error('Foydalanish: node scripts/create-admin.mjs <email> "<Familiya Ism>"')
  process.exit(1)
}
if (!url || !key) {
  console.error('NEXT_PUBLIC_SUPABASE_URL va SUPABASE_SERVICE_ROLE_KEY (.env.local) kerak')
  process.exit(1)
}

const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'
let password = ''
for (let i = 0; i < 14; i++) password += alphabet[randomInt(alphabet.length)]
password += '7'

const admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
const { data, error } = await admin.auth.admin.createUser({
  email: email.toLowerCase(),
  password,
  email_confirm: true,
  app_metadata: { role: 'admin' },
  user_metadata: { full_name: fullName },
})
if (error || !data.user) {
  console.error('Auth foydalanuvchisini yaratib bo\'lmadi:', error?.message ?? 'noma\'lum xato')
  process.exit(1)
}
const { error: pErr } = await admin.from('profiles').insert({
  id: data.user.id,
  role: 'admin',
  full_name: fullName,
  email: email.toLowerCase(),
  must_change_password: true,
})
if (pErr) {
  await admin.auth.admin.deleteUser(data.user.id)
  console.error('Profil yozilmadi (migratsiyalar qo\'llanganmi?):', pErr.message)
  process.exit(1)
}
console.log(`Administrator yaratildi: ${email}`)
console.log(`Vaqtinchalik parol: ${password}`)
console.log('Birinchi kirishda parolni almashtirishingiz kerak.')
