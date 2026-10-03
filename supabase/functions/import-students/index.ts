// Talabalar ro'yxatini (HEMIS eksporti / CSV) bazaga qo'shadi va faollashmagan
// talabalarga bir martalik faollashtirish kodlarini yaratadi.
//
// Kim chaqira oladi: admin yoki amaliyot rahbari (kirgan foydalanuvchi tokeni bilan).
// So'rov:  POST { students: [{hemis_id, full_name, group_name, course, faculty, specialty, university, kafedra}],
//                 reissue_hemis_ids?: string[] }   // yangi kod berilishi kerak bo'lgan talabalar
// Javob:   { total, created, updated, already_activated, kept_existing, codes: [{hemis_id, full_name, group_name, code}] }
//
// MUHIM: kodlar bazada faqat hash holida saqlanadi. Ochiq ko'rinishi - faqat shu javobda, bir marta.
import { adminClient, corsHeaders, getCaller, json, readJson } from "../_shared/server.ts";
import {
  CODE_TTL_DAYS,
  cleanStudentRow,
  formatCode,
  generateCode,
  hashCode,
  MAX_IMPORT_ROWS,
  normalizeHemisId,
  type StudentRow,
} from "../_shared/logic.ts";

const CHUNK = 200;

function chunks<T>(arr: T[], n: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Faqat POST" }, 405);

  const admin = adminClient();
  const caller = await getCaller(req, admin);
  if (!caller) return json({ error: "Avval tizimga kiring" }, 401);
  if (caller.role !== "admin" && caller.role !== "practice_head") {
    return json({ error: "Bu amal uchun ruxsat yo'q" }, 403);
  }

  const body = await readJson(req);
  if (!body || !Array.isArray(body.students)) return json({ error: "students ro'yxati kerak" }, 400);
  if (body.students.length === 0) return json({ error: "Ro'yxat bo'sh" }, 400);
  if (body.students.length > MAX_IMPORT_ROWS) {
    return json({ error: `Bir martada ${MAX_IMPORT_ROWS} tadan ko'p qator yuborib bo'lmaydi` }, 400);
  }

  // 1) Hammasini tekshiramiz: bitta xato bo'lsa HECH NARSA yozilmaydi.
  const rows = new Map<string, StudentRow>();
  const errors: string[] = [];
  body.students.forEach((raw, i) => {
    const { row, error } = cleanStudentRow(raw, i + 1);
    if (error) errors.push(error);
    else rows.set(row!.hemis_id, row!); // takror HEMIS ID bo'lsa oxirgisi olinadi
  });
  if (errors.length > 0) return json({ error: "Faylda xatolar bor", details: errors.slice(0, 50), total_errors: errors.length }, 400);

  const reissue = new Set<string>();
  if (Array.isArray(body.reissue_hemis_ids)) {
    for (const v of body.reissue_hemis_ids) {
      const h = normalizeHemisId(v);
      if (h) reissue.add(h);
    }
  }

  const ids = [...rows.keys()];

  // 2) Qaysilari yangi ekanini aniqlaymiz.
  const existing = new Set<string>();
  for (const part of chunks(ids, CHUNK)) {
    const { data, error } = await admin.from("students").select("hemis_id").in("hemis_id", part);
    if (error) return json({ error: "Bazani o'qishda xato" }, 500);
    data!.forEach((r) => existing.add(r.hemis_id as string));
  }

  // 3) Talabalarni yozamiz (profile_id va active tegilmaydi: faollashgan talaba aloqasi saqlanadi).
  for (const part of chunks([...rows.values()], CHUNK)) {
    const { error } = await admin.from("students").upsert(part, { onConflict: "hemis_id" });
    if (error) return json({ error: "Talabalarni yozishda xato" }, 500);
  }

  // 4) Yozilgan talabalarni (id bilan) qayta o'qiymiz.
  const saved: { id: string; hemis_id: string; full_name: string; group_name: string | null; profile_id: string | null }[] = [];
  for (const part of chunks(ids, CHUNK)) {
    const { data, error } = await admin.from("students")
      .select("id, hemis_id, full_name, group_name, profile_id").in("hemis_id", part);
    if (error) return json({ error: "Bazani o'qishda xato" }, 500);
    saved.push(...data!);
  }

  // 5) Faollashmaganlar uchun mavjud kodlarni ko'ramiz.
  const pending = saved.filter((s) => !s.profile_id);
  const codeRows = new Map<string, { used_at: string | null; expires_at: string }>();
  for (const part of chunks(pending.map((s) => s.id), CHUNK)) {
    const { data, error } = await admin.from("activation_codes")
      .select("student_id, used_at, expires_at").in("student_id", part);
    if (error) return json({ error: "Bazani o'qishda xato" }, 500);
    data!.forEach((r) => codeRows.set(r.student_id as string, r as never));
  }

  // 6) Kerakli talabalarga yangi kod beramiz: kodi yo'q, muddati o'tgan, ishlatilgan (lekin hisob yo'q) yoki qayta so'ralgan.
  const pepper = Deno.env.get("ACTIVATION_PEPPER") ?? "";
  const now = Date.now();
  const expiresAt = new Date(now + CODE_TTL_DAYS * 86400_000).toISOString();
  const issued: { hemis_id: string; full_name: string; group_name: string | null; code: string }[] = [];
  const toUpsert: Record<string, unknown>[] = [];
  let keptExisting = 0;

  for (const s of pending) {
    const c = codeRows.get(s.id);
    const needsNew = !c || c.used_at !== null || new Date(c.expires_at).getTime() < now || reissue.has(s.hemis_id);
    if (!needsNew) { keptExisting++; continue; }
    const code = generateCode(8);
    toUpsert.push({
      student_id: s.id,
      code_hash: await hashCode(code, s.hemis_id, pepper),
      expires_at: expiresAt,
      attempts: 0,
      used_at: null,
      created_at: new Date(now).toISOString(),
    });
    issued.push({ hemis_id: s.hemis_id, full_name: s.full_name, group_name: s.group_name, code: formatCode(code) });
  }
  for (const part of chunks(toUpsert, CHUNK)) {
    const { error } = await admin.from("activation_codes").upsert(part, { onConflict: "student_id" });
    if (error) return json({ error: "Kodlarni yozishda xato" }, 500);
  }

  const created = ids.filter((h) => !existing.has(h)).length;
  return json({
    total: ids.length,
    created,
    updated: ids.length - created,
    already_activated: saved.length - pending.length,
    kept_existing: keptExisting,
    codes: issued,
  });
});
