// HEMIS bilan integratsiya (ixtiyoriy): talabalar ro'yxatini HEMIS REST API'dan olib, portalga yozadi.
//
// DIQQAT: bu modul HEMIS ochiq API'sining ommaviy hujjatlarida ko'rsatilgan shaklga moslab yozilgan
// (GET <HEMIS_API_URL>/data/student-list?page=1&limit=200, "Authorization: Bearer <token>", javob:
// { success, data: { items: [...], pagination: { pageCount, ... } } }), lekin HAQIQIY HEMIS serveriga qarshi
// SINALMAGAN: sinovlar faqat soxta server bilan o'tkazilgan. Ulashdan oldin HEMIS administratori bilan
// maydon nomlari va ruxsatlarni tekshiring (docs/HEMIS.md). Maydon nomlari boshqacha bo'lsa faqat
// `mapHemisStudent` ni o'zgartirish kifoya. Portal HEMIS'ga FAQAT O'QISH so'rovlarini yuboradi.
import { MAX_IMPORT_ROWS } from "./logic.js";

const text = (v) => (v === undefined || v === null ? "" : String(v).trim());

// "1-kurs" / "2 kurs" / kod "12" (HEMIS: 11=1-kurs, 12=2-kurs ...) -> 1..6
export function courseOf(level) {
  if (level === undefined || level === null) return null;
  const obj = typeof level === "object" ? level : { name: level };
  const byName = /(\d)/.exec(text(obj.name));
  if (byName && Number(byName[1]) >= 1 && Number(byName[1]) <= 6) return Number(byName[1]);
  const code = text(obj.code);
  if (/^1[1-6]$/.test(code)) return Number(code) - 10;
  if (/^[1-6]$/.test(code)) return Number(code);
  return null;
}

export function mapHemisStudent(it, { university = "" } = {}) {
  const full = text(it.full_name) || [it.second_name, it.first_name, it.third_name].map(text).filter(Boolean).join(" ");
  return {
    hemis_id: text(it.student_id_number ?? it.id_number),
    full_name: full,
    group_name: text(it.group?.name ?? it.group_name),
    course: courseOf(it.level) ?? "",
    faculty: text(it.department?.name ?? it.faculty?.name ?? it.faculty),
    specialty: text(it.specialty?.name ?? it.specialty),
    university: university || text(it.university?.name),
    kafedra: "",
  };
}

// Barcha sahifalarni o'qiydi. fetchFn sinov uchun almashtiriladi.
export async function fetchHemisStudents({ apiUrl, token, pageSize = 200, extraQuery = "", university = "", fetchFn = fetch, maxRows = MAX_IMPORT_ROWS * 10 }) {
  if (!apiUrl || !token) throw new Error("HEMIS_API_URL va HEMIS_API_TOKEN berilishi kerak");
  const out = [];
  for (let page = 1; ; page++) {
    const url = `${apiUrl.replace(/\/+$/, "")}/data/student-list?page=${page}&limit=${pageSize}${extraQuery ? "&" + extraQuery.replace(/^&/, "") : ""}`;
    let res;
    try { res = await fetchFn(url, { headers: { Authorization: `Bearer ${token}`, Accept: "application/json" }, signal: AbortSignal.timeout(30000) }); }
    catch (e) { throw new Error(`HEMIS'ga ulanib bo'lmadi: ${e.message}`); }
    if (res.status === 401 || res.status === 403) throw new Error("HEMIS tokeni qabul qilinmadi (401/403): token yoki ruxsatni tekshiring");
    if (!res.ok) throw new Error(`HEMIS xatosi: HTTP ${res.status}`);
    const body = await res.json().catch(() => null);
    const items = body?.data?.items;
    if (!Array.isArray(items)) throw new Error("HEMIS javobi kutilgan shaklda emas (data.items yo'q)");
    for (const it of items) out.push(mapHemisStudent(it, { university }));
    if (out.length > maxRows) throw new Error("HEMIS'dan juda ko'p qator keldi; HEMIS_QUERY bilan filtrlang");
    const pages = Number(body.data.pagination?.pageCount ?? 1);
    if (page >= pages || items.length === 0) break;
  }
  return out;
}
