// Edge Function'lar uchun toza (Deno'ga bog'liq bo'lmagan) mantiq.
// Node'da ham sinab ko'riladi: supabase/tests/logic.test.mjs

// Foydalanuvchilar Supabase Auth'da email bilan saqlanadi, lekin biz login ishlatamiz.
// ".invalid" - ro'yxatdan o'tkazib bo'lmaydigan domen: hech kim bu manzilga
// "parolni tiklash" xatini ola olmaydi (hisobni egallab olish xavfi yo'q).
export const STUDENT_EMAIL_DOMAIN = "students.res.invalid";
export const STAFF_EMAIL_DOMAIN = "staff.res.invalid";

export const CODE_TTL_DAYS = 30;
export const MAX_CODE_ATTEMPTS = 5;
export const MAX_IMPORT_ROWS = 2000;

// 0/O, 1/I/L kabi adashtiradigan belgilar yo'q (31 ta belgi).
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

export type StaffRole = "res_head" | "practice_head" | "admin";
export const STAFF_ROLES: StaffRole[] = ["res_head", "practice_head", "admin"];

export function studentEmail(hemisId: string): string {
  return `${hemisId}@${STUDENT_EMAIL_DOMAIN}`;
}
export function staffEmail(login: string): string {
  return `${login}@${STAFF_EMAIL_DOMAIN}`;
}

export function normalizeHemisId(v: unknown): string | null {
  const s = String(v ?? "").trim();
  return /^[0-9]{6,20}$/.test(s) ? s : null;
}

// Xodim logini harf bilan boshlanadi (faqat raqamli bo'lmaydi), talaba HEMIS ID'si bilan to'qnashmasin.
export function normalizeStaffLogin(v: unknown): string | null {
  const s = String(v ?? "").trim().toLowerCase();
  return /^[a-z][a-z0-9._-]{2,31}$/.test(s) ? s : null;
}

export function passwordError(p: unknown): string | null {
  if (typeof p !== "string") return "Parol kiritilmagan";
  if (p.length < 8) return "Parol kamida 8 ta belgi bo'lishi kerak";
  if (p.length > 72) return "Parol 72 belgidan oshmasligi kerak";
  return null;
}

export function normalizeCode(v: unknown): string {
  return String(v ?? "").toUpperCase().replace(/[\s-]/g, "");
}

// Tasodifiy kod. Modulo tarafkashligi bo'lmasligi uchun 248 dan katta baytlar tashlab yuboriladi (31*8=248).
export function generateCode(length = 8): string {
  let out = "";
  while (out.length < length) {
    const bytes = crypto.getRandomValues(new Uint8Array(length * 2));
    for (const b of bytes) {
      if (b < 248 && out.length < length) out += ALPHABET[b % ALPHABET.length];
    }
  }
  return out;
}

export function formatCode(code: string): string {
  return code.length === 8 ? `${code.slice(0, 4)}-${code.slice(4)}` : code;
}

export async function hashCode(code: string, hemisId: string, pepper = ""): Promise<string> {
  const data = new TextEncoder().encode(`${pepper}:${hemisId}:${code}`);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export interface StudentRow {
  hemis_id: string;
  full_name: string;
  group_name: string | null;
  course: number | null;
  faculty: string | null;
  specialty: string | null;
  university: string | null;
  kafedra: string | null;
}

function optText(v: unknown, max = 200): string | null {
  const s = String(v ?? "").trim();
  return s === "" ? null : s.slice(0, max);
}

// Bitta import qatorini tekshiradi (indeks 1 dan boshlanadi - CSV sarlavhasi hisobga olinmaydi).
export function cleanStudentRow(raw: unknown, index: number): { row?: StudentRow; error?: string } {
  if (typeof raw !== "object" || raw === null) return { error: `${index}-qator: noto'g'ri format` };
  const r = raw as Record<string, unknown>;
  const hemis = normalizeHemisId(r.hemis_id);
  if (!hemis) return { error: `${index}-qator: HEMIS ID 6-20 ta raqamdan iborat bo'lishi kerak` };
  const name = optText(r.full_name, 200);
  if (!name) return { error: `${index}-qator (${hemis}): F.I.SH bo'sh` };

  let course: number | null = null;
  const cRaw = String(r.course ?? "").trim();
  if (cRaw !== "") {
    const c = Number(cRaw);
    if (!Number.isInteger(c) || c < 1 || c > 6) return { error: `${index}-qator (${hemis}): kurs 1-6 oralig'ida bo'lishi kerak` };
    course = c;
  }
  return {
    row: {
      hemis_id: hemis,
      full_name: name,
      group_name: optText(r.group_name, 50),
      course,
      faculty: optText(r.faculty),
      specialty: optText(r.specialty),
      university: optText(r.university),
      kafedra: optText(r.kafedra),
    },
  };
}
