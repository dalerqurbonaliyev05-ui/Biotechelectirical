// Toza mantiq (bazaga va tarmoqqa bog'liq emas): tekshiruvlar, kodlar, ruxsat qoidalari.
import crypto from "node:crypto";

export const CODE_TTL_DAYS = 30;
export const MAX_CODE_ATTEMPTS = 5;
export const MAX_IMPORT_ROWS = 2000;

// 0/O, 1/I/L kabi adashtiradigan belgilar yo'q (31 ta belgi).
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

export const STAFF_ROLES = ["res_head", "practice_head", "admin"];
export const ALL_ROLES = ["student", ...STAFF_ROLES];

export function normalizeHemisId(v) {
  const s = String(v ?? "").trim();
  return /^[0-9]{6,20}$/.test(s) ? s : null;
}

// Xodim logini harf bilan boshlanadi (faqat raqamli bo'lmaydi): talaba HEMIS ID'si bilan to'qnashmasin.
export function normalizeStaffLogin(v) {
  const s = String(v ?? "").trim().toLowerCase();
  return /^[a-z][a-z0-9._-]{2,31}$/.test(s) ? s : null;
}

// Kirishda: talaba (faqat raqam) yoki xodim logini. Noto'g'ri bo'lsa null.
export function normalizeLogin(v) {
  const s = String(v ?? "").trim().toLowerCase();
  if (/^[0-9]{6,20}$/.test(s)) return s;
  return normalizeStaffLogin(s);
}

export function passwordError(p) {
  if (typeof p !== "string") return "Parol kiritilmagan";
  if (p.length < 8) return "Parol kamida 8 ta belgi bo'lishi kerak";
  if (p.length > 72) return "Parol 72 belgidan oshmasligi kerak";
  return null;
}

export function normalizeCode(v) {
  return String(v ?? "").toUpperCase().replace(/[\s-]/g, "");
}

// Tasodifiy kod: kriptografik, tarafkashliksiz (crypto.randomInt).
export function generateCode(length = 8) {
  let out = "";
  for (let i = 0; i < length; i++) out += ALPHABET[crypto.randomInt(ALPHABET.length)];
  return out;
}

export function formatCode(code) {
  return code.length === 8 ? `${code.slice(0, 4)}-${code.slice(4)}` : code;
}

// Vaqtinchalik parol (xodim yaratilganda yoki parol tiklanganda): 12 belgi, o'qish uchun guruhlangan.
export function generateTempPassword() {
  const c = generateCode(12);
  return `${c.slice(0, 4)}-${c.slice(4, 8)}-${c.slice(8)}`;
}

// Kodning xeshi: HMAC-SHA256 (kalit = serverning sirli "pepper"i). Baza sizib chiqsa ham kodni
// topib bo'lmaydi: kalit bazada emas, server muhitida.
export function hashCode(code, hemisId, pepper) {
  return crypto.createHmac("sha256", pepper).update(`${hemisId}:${code}`).digest("hex");
}

export function timingSafeEqualStr(a, b) {
  const x = Buffer.from(String(a)), y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

// Kod hali ishlatilmagan va muddati o'tmagan bo'lsagina foydalanish mumkin.
export function codeUsable(row, now = Date.now()) {
  return !!row && row.used_at === null && new Date(row.expires_at).getTime() > now;
}

// Kim kimni boshqara oladi:
//  - admin: hammani (xodim yaratish, parol tiklash, faolsizlantirish);
//  - amaliyot rahbari: faqat TALABALARNING parolini tiklashi mumkin;
//  - qolganlar: hech narsa.
export function canManage(caller, target, action) {
  if (caller === "admin") return action === "create_staff" ? target !== "student" && target !== null : target !== null;
  if (caller === "practice_head") return action === "reset_password" && target === "student";
  return false;
}

function optText(v, max = 200) {
  const s = String(v ?? "").trim();
  return s === "" ? null : s.slice(0, max);
}

// Bitta import qatorini tekshiradi (indeks 1 dan boshlanadi - CSV sarlavhasi hisobga olinmaydi).
export function cleanStudentRow(raw, index) {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return { error: `${index}-qator: noto'g'ri format` };
  const hemis = normalizeHemisId(raw.hemis_id);
  if (!hemis) return { error: `${index}-qator: HEMIS ID 6-20 ta raqamdan iborat bo'lishi kerak` };
  const name = optText(raw.full_name, 200);
  if (!name) return { error: `${index}-qator (${hemis}): F.I.SH bo'sh` };
  let course = null;
  const cRaw = String(raw.course ?? "").trim();
  if (cRaw !== "") {
    const c = Number(cRaw);
    if (!Number.isInteger(c) || c < 1 || c > 6) return { error: `${index}-qator (${hemis}): kurs 1-6 oralig'ida bo'lishi kerak` };
    course = c;
  }
  return {
    row: {
      hemis_id: hemis, full_name: name, group_name: optText(raw.group_name, 50), course,
      faculty: optText(raw.faculty), specialty: optText(raw.specialty), university: optText(raw.university), kafedra: optText(raw.kafedra),
    },
  };
}

export const isUuid = (s) => typeof s === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
