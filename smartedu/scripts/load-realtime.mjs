#!/usr/bin/env node
/**
 * Realtime yuklama sinovi (SmartEdu). Haqiqiy Supabase loyihasiga ulanadi — SHUNING UCHUN faqat sinov loyihasida ishlating.
 *
 * Nima o'lchanadi: N ta "talaba" bitta kanalga (`session:loadtest-<vaqt>`) ulanadi; "o'qituvchi" soniyasiga R ta `state`
 * hodisasi yuboradi, har bir talaba qabul qilish kechikishini (ms) o'lchaydi. Natija: ulanganlar soni, yo'qolgan xabarlar ulushi,
 * kechikish p50/p95/p99. Bepul tarif chegaralari: https://supabase.com/docs/guides/realtime/limits
 *
 * Ishga tushirish (kalitlar .env'dan; hech qachon gitga tushirmang):
 *   LOAD_SUPABASE_URL=https://xxxx.supabase.co LOAD_SUPABASE_ANON_KEY=... \
 *   node scripts/load-realtime.mjs --clients 100 --seconds 20 --rate 2 --yes
 *
 * HOLAT: bu skript yozilgan, lekin ishga TUSHIRILMAGAN (ishlab chiqish muhitida Supabase loyihasi yo'q edi) —
 * natijalar haqida hech narsa da'vo qilinmaydi. Birinchi haqiqiy dars oldidan o'zingiz ishga tushiring (docs/limitations.md).
 */
import { createClient } from '@supabase/supabase-js'

const arg = (name, def) => {
  const i = process.argv.indexOf(`--${name}`)
  return i > -1 ? Number(process.argv[i + 1]) : def
}
const clients = arg('clients', 50)
const seconds = arg('seconds', 15)
const rate = arg('rate', 2)
const url = process.env.LOAD_SUPABASE_URL
const key = process.env.LOAD_SUPABASE_ANON_KEY

if (!url || !key || !process.argv.includes('--yes')) {
  console.error('Kerak: LOAD_SUPABASE_URL, LOAD_SUPABASE_ANON_KEY va --yes (haqiqiy loyihaga yuklama tushishini tasdiqlash).')
  process.exit(2)
}
if (clients > 500) {
  console.error('Xavfsizlik: --clients ≤ 500 (bepul tarif chegarasini sinab ko‘rishda ehtiyot bo‘ling).')
  process.exit(2)
}

const topic = `session:loadtest-${Date.now()}`
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const pct = (arr, p) => (arr.length ? arr[Math.min(arr.length - 1, Math.floor((p / 100) * arr.length))] : NaN)

const latencies = []
let received = 0
let connected = 0
const subs = []

for (let i = 0; i < clients; i++) {
  const sb = createClient(url, key, { auth: { persistSession: false }, realtime: { params: { eventsPerSecond: 20 } } })
  const ch = sb
    .channel(topic, { config: { broadcast: { self: false } } })
    .on('broadcast', { event: 'state' }, ({ payload }) => {
      received++
      latencies.push(Date.now() - payload.t)
    })
  ch.subscribe((st) => {
    if (st === 'SUBSCRIBED') connected++
  })
  subs.push({ sb, ch })
  if (i % 20 === 19) await sleep(200) // ulanishlarni to'lqin bilan ochamiz
}
await sleep(3000)
console.log(`Ulandi: ${connected}/${clients}`)

const tx = createClient(url, key, { auth: { persistSession: false } })
const txCh = tx.channel(topic, { config: { broadcast: { self: false } } })
await new Promise((res) => txCh.subscribe((st) => st === 'SUBSCRIBED' && res()))

let sent = 0
const end = Date.now() + seconds * 1000
while (Date.now() < end) {
  await txCh.send({ type: 'broadcast', event: 'state', payload: { t: Date.now(), n: sent++ } })
  await sleep(1000 / rate)
}
await sleep(3000)

latencies.sort((a, b) => a - b)
const expected = sent * connected
console.log(
  JSON.stringify(
    {
      clients,
      connected,
      sent,
      expectedDeliveries: expected,
      received,
      lossPct: expected ? Math.round((1 - received / expected) * 1000) / 10 : null,
      latencyMs: { p50: pct(latencies, 50), p95: pct(latencies, 95), p99: pct(latencies, 99) },
    },
    null,
    2,
  ),
)
for (const { sb, ch } of subs) await sb.removeChannel(ch)
await tx.removeChannel(txCh)
process.exit(0)
