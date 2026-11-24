#!/usr/bin/env node
// Laboratoriya integratsiyasini sinash: imzolangan natijani SmartEdu'ga yuboradi.
//   LAB_SHARED_SECRET=... node scripts/lab-sign.mjs --url http://localhost:3000/api/lab/submit \
//        --code S001 --lab motor-01 --score 8 --max 10 [--passed true] [--print]
// --print: faqat tana va imzoni chop etadi (so'rov yubormaydi).
import { createHmac, randomBytes } from 'node:crypto'

const args = Object.fromEntries(
  process.argv
    .slice(2)
    .flatMap((a, i, all) =>
      a.startsWith('--')
        ? [
            [
              a.slice(2),
              all[i + 1]?.startsWith('--') || all[i + 1] === undefined ? 'true' : all[i + 1],
            ],
          ]
        : [],
    ),
)
const secret = process.env.LAB_SHARED_SECRET
if (!secret || secret.length < 16) {
  console.error('LAB_SHARED_SECRET (kamida 16 belgi) berilmagan')
  process.exit(1)
}
const body = JSON.stringify({
  student_code: args.code ?? 'S001',
  lab_id: args.lab ?? 'motor-01',
  score: Number(args.score ?? 8),
  max_score: Number(args.max ?? 10),
  passed: args.passed === undefined ? undefined : args.passed === 'true',
  time: new Date().toISOString(),
  nonce: randomBytes(12).toString('base64url'),
})
// Imzo tananing AYNAN baytlariga qo'yiladi: shu satrni o'zgartirmasdan yuboring
const signature = 'sha256=' + createHmac('sha256', secret).update(body, 'utf8').digest('hex')

if (args.print || !args.url) {
  console.log(body)
  console.log('X-Signature:', signature)
} else {
  const res = await fetch(args.url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Signature': signature },
    body,
  })
  console.log(res.status, await res.text())
}
