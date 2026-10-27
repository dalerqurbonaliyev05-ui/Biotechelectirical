// Vositalar bo'limidagi ayrim loyihalarni kod bilan yopish (Vercel Routing Middleware).
//
// Qanday ishlaydi:
//  1. Kimdir yopiq papkaga kirsa (masalan /3kurs/), middleware cookie'ni tekshiradi.
//  2. Cookie yo'q yoki noto'g'ri bo'lsa — /kod/ sahifasiga yuboriladi.
//  3. U yerda kod kiritiladi -> /kod/tekshir (POST) -> kod to'g'ri bo'lsa 30 kunlik cookie beriladi.
//
// Kodning o'zi bu faylda YO'Q. U Vercel -> Project -> Settings -> Environment Variables
// bo'limida VOSITALAR_KOD nomi bilan saqlanadi va brauzerga hech qachon yuborilmaydi.
// Kodni o'zgartirsangiz, avval kirgan hammaning cookie'si avtomatik bekor bo'ladi.

// Yopiq papkalar. Yangi loyihani yopish uchun shu ro'yxatga VA pastdagi config.matcher'ga qo'shing.
const YOPIQ = [
  '/3kurs',                  // EET kurs loyihasi
  '/rele-himoya-kurs',       // Releli himoya va avtomatikasi
  '/sanoat-elektr-taminoti', // Sanoat korxonasining elektr ta'minoti
  '/transformator-kurs',     // Kuch transformatori hisobi
  '/yangiloyiha1',           // RES tizimi loyihasi
];

// Yopiq papka ichida bo'lsa ham ochiq qoladigan joylar.
const ISTISNO = [
  '/yangiloyiha1/mushuk-it-admin', // "Mushuk va itlar" admin paneli — o'z logini bor
];

const COOKIE = 'ev_kod';
const MUDDAT = 60 * 60 * 24 * 30; // 30 kun (soniyalarda)

export const config = {
  matcher: [
    '/kod/tekshir',
    '/kod/chiqish',
    '/3kurs',
    '/3kurs/:path*',
    '/rele-himoya-kurs',
    '/rele-himoya-kurs/:path*',
    '/sanoat-elektr-taminoti',
    '/sanoat-elektr-taminoti/:path*',
    '/transformator-kurs',
    '/transformator-kurs/:path*',
    '/yangiloyiha1',
    '/yangiloyiha1/:path*',
  ],
};

const enc = new TextEncoder();

function hex(buf) {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

// Cookie qiymati: kodning o'zi emas, undan olingan HMAC imzo. Uni soxtalashtirib bo'lmaydi.
async function imzo(kod) {
  const key = await crypto.subtle.importKey('raw', enc.encode(kod), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return hex(await crypto.subtle.sign('HMAC', key, enc.encode('energyvibe-vositalar-v1')));
}

// Ikki satrni vaqt bo'yicha teng solishtirish (javob tezligidan kodni taxmin qilib bo'lmasin).
async function teng(a, b) {
  const [ha, hb] = await Promise.all([
    crypto.subtle.digest('SHA-256', enc.encode(String(a))),
    crypto.subtle.digest('SHA-256', enc.encode(String(b))),
  ]);
  const x = new Uint8Array(ha);
  const y = new Uint8Array(hb);
  let farq = 0;
  for (let i = 0; i < x.length; i++) farq |= x[i] ^ y[i];
  return farq === 0;
}

function boshlanadi(path, prefix) {
  return path === prefix || path.startsWith(prefix + '/');
}

function yopiqmi(path) {
  if (ISTISNO.some((p) => boshlanadi(path, p))) return false;
  return YOPIQ.some((p) => boshlanadi(path, p));
}

// Kirgandan keyin qaytiladigan manzil faqat shu saytning yopiq sahifasi bo'lishi kerak
// (boshqa saytga yo'naltirib yuborish hiylasining oldini olish).
function xavfsizManzil(raw) {
  const s = String(raw || '');
  if (!s.startsWith('/') || s.startsWith('//') || s.startsWith('/\\')) return '/';
  try {
    const u = new URL(s, 'https://energyvibe.uz');
    if (u.origin !== 'https://energyvibe.uz') return '/';
    return u.pathname + u.search;
  } catch {
    return '/';
  }
}

function cookieOl(request, nom) {
  const header = request.headers.get('cookie') || '';
  for (const qism of header.split(';')) {
    const i = qism.indexOf('=');
    if (i > -1 && qism.slice(0, i).trim() === nom) return qism.slice(i + 1).trim();
  }
  return '';
}

function yonaltir(request, manzil, qoshimcha = {}) {
  return new Response(null, {
    status: 303,
    headers: { Location: new URL(manzil, request.url).toString(), 'Cache-Control': 'no-store', ...qoshimcha },
  });
}

function kodSahifasi(request, keyingi, xato) {
  const q = new URLSearchParams({ next: keyingi });
  if (xato) q.set('xato', xato);
  return yonaltir(request, '/kod/?' + q.toString());
}

export default async function middleware(request) {
  const url = new URL(request.url);
  const path = url.pathname;
  const kod = (process.env.VOSITALAR_KOD || '').trim();

  // 1) Kod kiritish formasi shu yerga yuboriladi.
  if (path === '/kod/tekshir') {
    if (request.method !== 'POST') return yonaltir(request, '/kod/');
    let kiritilgan = '';
    let keyingi = '/';
    try {
      const form = await request.formData();
      kiritilgan = String(form.get('kod') || '').trim();
      keyingi = xavfsizManzil(form.get('next'));
    } catch {
      return yonaltir(request, '/kod/');
    }
    if (!kod) return kodSahifasi(request, keyingi, 'sozlanmagan');

    // Har bir urinish biroz kutadi — kodni ketma-ket taxmin qilib topishni sekinlashtiradi.
    await new Promise((r) => setTimeout(r, 700));

    if (!kiritilgan || !(await teng(kiritilgan, kod))) return kodSahifasi(request, keyingi, 'notogri');

    const cookie = `${COOKIE}=${await imzo(kod)}; Path=/; Max-Age=${MUDDAT}; HttpOnly; Secure; SameSite=Lax`;
    return yonaltir(request, keyingi, { 'Set-Cookie': cookie });
  }

  // 2) Chiqish: cookie'ni o'chiradi.
  if (path === '/kod/chiqish') {
    return yonaltir(request, '/', { 'Set-Cookie': `${COOKIE}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax` });
  }

  // 3) Ochiq sahifa bo'lsa — hech narsa qilmaymiz, sahifa odatdagidek ochiladi.
  if (!yopiqmi(path)) return;

  // 4) Yopiq sahifa: cookie to'g'ri bo'lsa o'tkazamiz.
  if (kod) {
    const bor = cookieOl(request, COOKIE);
    if (bor && (await teng(bor, await imzo(kod)))) return;
  }

  return kodSahifasi(request, path + url.search, kod ? '' : 'sozlanmagan');
}
