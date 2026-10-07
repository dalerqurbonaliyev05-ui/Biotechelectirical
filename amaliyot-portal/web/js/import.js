// Talabalar ro'yxatini (HEMIS eksporti: CSV yoki Excel'dan nusxa olingan matn) o'qish.
// Toza mantiq: brauzer va Node'da bir xil ishlaydi (tests/ui/import.test.mjs).

// Ajratuvchini birinchi qatordan aniqlaydi: tab (Excel'dan nusxa), nuqta-vergul yoki vergul.
export function detectDelimiter(text) {
  const first = String(text).split(/\r?\n/, 1)[0] ?? "";
  const counts = { "\t": 0, ";": 0, ",": 0 };
  let inQ = false;
  for (const ch of first) {
    if (ch === '"') inQ = !inQ;
    else if (!inQ && ch in counts) counts[ch]++;
  }
  const best = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
  return best[1] > 0 ? best[0] : ",";
}

// Qo'shtirnoqlar ("a;b", "") va qator ichidagi yangi qatorlarni qo'llab-quvvatlaydi.
export function parseDelimited(text, delimiter = detectDelimiter(text)) {
  const src = String(text).replace(/^﻿/, "");
  const rows = [];
  let row = [], cell = "", inQ = false;
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (inQ) {
      if (ch === '"') {
        if (src[i + 1] === '"') { cell += '"'; i++; } else inQ = false;
      } else cell += ch;
    } else if (ch === '"') inQ = true;
    else if (ch === delimiter) { row.push(cell); cell = ""; }
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && src[i + 1] === "\n") i++;
      row.push(cell); cell = "";
      rows.push(row); row = [];
    } else cell += ch;
  }
  if (cell !== "" || row.length) { row.push(cell); rows.push(row); }
  return rows.filter((r) => r.some((c) => String(c).trim() !== ""));
}

export function normHeader(h) {
  return String(h ?? "")
    .toLowerCase()
    .replace(/[ʻʼ‘’`´]/g, "'")
    .replace(/[._]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const ALIASES = {
  hemis_id: ["hemis id", "hemisid", "hemis", "id", "talaba id", "student id", "student id number", "hemis raqami", "id raqam", "идентификатор", "hemis_id"],
  full_name: ["fish", "f i sh", "f i o", "fio", "full name", "fullname", "ism familiya", "ism sharif", "talaba", "ф и о", "фио", "to'liq ism"],
  surname: ["familiya", "familiyasi", "фамилия", "last name", "second name"],
  first: ["ism", "ismi", "first name", "имя"],
  third: ["otasining ismi", "sharif", "sharifi", "third name", "отчество"],
  group_name: ["guruh", "guruh nomi", "group", "group name", "группа"],
  course: ["kurs", "course", "level", "bosqich", "курс"],
  faculty: ["fakultet", "faculty", "department", "факультет"],
  specialty: ["yo'nalish", "yonalish", "mutaxassislik", "specialty", "speciality", "направление"],
  university: ["universitet", "university", "otm", "oliy ta'lim muassasasi", "вуз"],
  kafedra: ["kafedra", "кафедра"],
};

const LOOKUP = new Map();
for (const [key, list] of Object.entries(ALIASES)) for (const a of list) LOOKUP.set(normHeader(a), key);

export function mapHeaders(headerRow) {
  const cols = {};
  const unknown = [];
  headerRow.forEach((h, i) => {
    const key = LOOKUP.get(normHeader(h));
    if (key && !(key in cols)) cols[key] = i;
    else if (String(h).trim() !== "") unknown.push(String(h).trim());
  });
  return { cols, unknown };
}

function parseCourse(v) {
  const s = String(v ?? "").trim();
  if (s === "") return { value: null };
  const m = s.match(/^(\d)(?!\d)/);
  if (!m) return { error: `kurs tushunarsiz: "${s}"` };
  const n = Number(m[1]);
  return n >= 1 && n <= 6 ? { value: n } : { error: `kurs 1-6 bo'lishi kerak: "${s}"` };
}

// table: parseDelimited natijasi (birinchi qator - sarlavha).
// Qaytaradi: { students, errors: ["3-qator: ..."], unknownHeaders, missing: ["hemis_id", ...] }
export function rowsToStudents(table) {
  if (!table.length) return { students: [], errors: [], unknownHeaders: [], missing: ["hemis_id", "full_name"] };
  const { cols, unknown } = mapHeaders(table[0]);
  const hasName = "full_name" in cols || "surname" in cols;
  const missing = [];
  if (!("hemis_id" in cols)) missing.push("hemis_id");
  if (!hasName) missing.push("full_name");
  if (missing.length) return { students: [], errors: [], unknownHeaders: unknown, missing };

  const get = (r, k) => (k in cols ? String(r[cols[k]] ?? "").trim() : "");
  const students = [];
  const errors = [];
  const seen = new Set();
  table.slice(1).forEach((r, idx) => {
    const line = idx + 2; // faylda ko'ringan qator raqami (1 - sarlavha)
    const hemis = get(r, "hemis_id");
    if (/[eE][+-]?\d/.test(hemis) && /^[\d.,]+[eE]/.test(hemis)) {
      errors.push(`${line}-qator: HEMIS ID Excel'da "${hemis}" ko'rinishiga aylangan. Ustunni "Matn" formatiga o'tkazib qayta saqlang`);
      return;
    }
    if (!/^\d{6,20}$/.test(hemis)) { errors.push(`${line}-qator: HEMIS ID 6-20 ta raqam bo'lishi kerak ("${hemis}")`); return; }
    let name = get(r, "full_name");
    if (!name) name = [get(r, "surname"), get(r, "first"), get(r, "third")].filter(Boolean).join(" ");
    if (!name) { errors.push(`${line}-qator (${hemis}): F.I.SH bo'sh`); return; }
    const c = parseCourse(get(r, "course"));
    if (c.error) { errors.push(`${line}-qator (${hemis}): ${c.error}`); return; }
    if (seen.has(hemis)) { errors.push(`${line}-qator: HEMIS ID ${hemis} faylda takrorlangan`); return; }
    seen.add(hemis);
    students.push({
      hemis_id: hemis,
      full_name: name,
      group_name: get(r, "group_name") || null,
      course: c.value,
      faculty: get(r, "faculty") || null,
      specialty: get(r, "specialty") || null,
      university: get(r, "university") || null,
      kafedra: get(r, "kafedra") || null,
    });
  });
  return { students, errors, unknownHeaders: unknown, missing: [] };
}

export function parseStudentsText(text) {
  return rowsToStudents(parseDelimited(text));
}
