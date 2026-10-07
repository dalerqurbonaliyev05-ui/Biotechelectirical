// Ma'lumotlar shlyuzi: sahifalardan keladigan tuzilmali so'rovni xavfsiz parametrli SQL'ga aylantiradi.
//
// Xavfsizlik:
//  - jadval va ustun nomlari FAQAT bazadagi ruxsat etilgan ro'yxatdan (information_schema) olinadi: SQL inyeksiya yo'q;
//  - qiymatlar doim parametr ($1, $2...) sifatida uzatiladi;
//  - so'rov foydalanuvchi huquqi bilan bajariladi (SET LOCAL ROLE authenticated): RLS qoidalari qo'llanadi;
//  - maxfiy jadvallar (credentials, sessions, activation_codes, audit_log) ro'yxatda yo'q;
//  - update/delete filtrsiz taqiqlanadi; select natijasi 1000 qatordan oshmaydi.
import { HttpError } from "./errors.js";

export const ALLOWED_TABLES = [
  "profiles", "students", "practice_periods", "brigades", "attendance", "tasks",
  "announcements", "photos", "feedbacks", "approvals", "settings",
];
const OPS = { eq: "=", neq: "<>", gte: ">=", lte: "<=", gt: ">", lt: "<" };
const MAX_ROWS = 1000;
const MAX_FILTERS = 12;
const MAX_INSERT_ROWS = 2000;

export async function loadCatalog(db) {
  const r = await db.asService((c) => c.query(
    "select table_name, column_name from information_schema.columns where table_schema = 'public' and table_name = any($1)", [ALLOWED_TABLES]));
  const cols = new Map(ALLOWED_TABLES.map((t) => [t, new Set()]));
  for (const row of r.rows) cols.get(row.table_name).add(row.column_name);
  return cols;
}

const q = (name) => `"${name}"`;

function colList(catalog, table, spec) {
  const known = catalog.get(table);
  if (spec === undefined || spec === null || spec === "*") return null;
  const names = String(spec).split(",").map((s) => s.trim()).filter(Boolean);
  if (!names.length) return null;
  for (const n of names) if (!known.has(n)) throw new HttpError(400, `Noma'lum ustun: ${n}`);
  return names;
}

function buildWhere(catalog, table, filters, params) {
  if (filters === undefined) return "";
  if (!Array.isArray(filters) || filters.length > MAX_FILTERS) throw new HttpError(400, "Filtrlar noto'g'ri");
  const known = catalog.get(table);
  const parts = filters.map((f) => {
    if (!f || typeof f !== "object" || !known.has(f.col)) throw new HttpError(400, `Noma'lum ustun: ${f && f.col}`);
    if (f.op === "in") {
      if (!Array.isArray(f.val) || f.val.length > 5000) throw new HttpError(400, "in filtri massiv bo'lishi kerak");
      params.push(f.val);
      return `${q(f.col)} = any($${params.length})`;
    }
    if (!(f.op in OPS)) throw new HttpError(400, `Noma'lum filtr: ${f.op}`);
    if (f.val !== null && typeof f.val === "object") throw new HttpError(400, "Filtr qiymati oddiy bo'lishi kerak");
    if (f.val === null) {
      if (f.op === "eq") return `${q(f.col)} is null`;
      if (f.op === "neq") return `${q(f.col)} is not null`;
      throw new HttpError(400, "null bilan faqat eq/neq");
    }
    params.push(f.val);
    return `${q(f.col)} ${OPS[f.op]} $${params.length}`;
  });
  return parts.length ? ` where ${parts.join(" and ")}` : "";
}

function pgError(e) {
  // PostgreSQL xatolarini mijozga tushunarli (lekin ichki tuzilmani ochmaydigan) shaklda qaytaramiz.
  const code = e.code || "";
  if (code === "42501") return new HttpError(403, "Bu amal uchun ruxsat yo'q", { code });
  if (code === "23505") return new HttpError(409, `duplicate key value violates unique constraint`, { code });
  if (code === "23503") return new HttpError(409, "Bog'langan yozuv topilmadi yoki o'chirib bo'lmaydi", { code });
  if (code === "23514" || code === "23502" || code === "22P02" || code === "22007" || code === "22008" || code === "22003" || code === "22001" || code === "22023")
    return new HttpError(400, "Ma'lumot noto'g'ri formatda", { code });
  if (code === "57014") return new HttpError(504, "So'rov juda uzoq davom etdi", { code });
  return null;
}

export function createGateway({ db, catalog }) {
  async function execute(claims, body) {
    if (!body || typeof body !== "object") throw new HttpError(400, "So'rov noto'g'ri");
    const table = body.table;
    if (!ALLOWED_TABLES.includes(table)) throw new HttpError(400, "Noma'lum jadval");
    const known = catalog.get(table);
    const params = [];
    let sql, op = body.op;
    const returning = body.returning === true;
    const retCols = colList(catalog, table, body.select);
    const retSql = returning ? ` returning ${retCols ? retCols.map(q).join(", ") : "*"}` : "";

    if (op === "select") {
      const cols = retCols ? retCols.map(q).join(", ") : "*";
      sql = `select ${cols} from public.${q(table)}${buildWhere(catalog, table, body.filters, params)}`;
      if (body.order !== undefined) {
        if (!Array.isArray(body.order) || body.order.length > 4) throw new HttpError(400, "Tartib noto'g'ri");
        sql += " order by " + body.order.map((o) => {
          if (!o || !known.has(o.col)) throw new HttpError(400, `Noma'lum ustun: ${o && o.col}`);
          return `${q(o.col)} ${o.asc === false ? "desc" : "asc"}`;
        }).join(", ");
      }
      let limit = MAX_ROWS, offset = 0;
      if (Array.isArray(body.range)) {
        const [a, b] = body.range.map(Number);
        if (!Number.isInteger(a) || !Number.isInteger(b) || a < 0 || b < a) throw new HttpError(400, "Oraliq noto'g'ri");
        offset = a; limit = Math.min(b - a + 1, MAX_ROWS);
      }
      if (body.limit !== undefined) {
        const n = Number(body.limit);
        if (!Number.isInteger(n) || n < 1) throw new HttpError(400, "Limit noto'g'ri");
        limit = Math.min(limit, n);
      }
      sql += ` limit ${limit} offset ${offset}`;
    } else if (op === "insert" || op === "upsert") {
      const rows = Array.isArray(body.values) ? body.values : [body.values];
      if (!rows.length || rows.length > MAX_INSERT_ROWS || rows.some((r) => !r || typeof r !== "object" || Array.isArray(r))) throw new HttpError(400, "Qiymatlar noto'g'ri");
      const cols = [...new Set(rows.flatMap((r) => Object.keys(r)))];
      if (!cols.length) throw new HttpError(400, "Qiymatlar bo'sh");
      for (const c of cols) if (!known.has(c)) throw new HttpError(400, `Noma'lum ustun: ${c}`);
      const tuples = rows.map((r) => `(${cols.map((c) => {
        if (!(c in r)) return "default";
        const v = r[c];
        if (v !== null && typeof v === "object") throw new HttpError(400, "Qiymat oddiy bo'lishi kerak");
        params.push(v);
        return `$${params.length}`;
      }).join(", ")})`);
      sql = `insert into public.${q(table)} (${cols.map(q).join(", ")}) values ${tuples.join(", ")}`;
      if (op === "upsert") {
        const target = colList(catalog, table, body.onConflict);
        if (!target) throw new HttpError(400, "onConflict kerak");
        const upd = cols.filter((c) => !target.includes(c));
        sql += ` on conflict (${target.map(q).join(", ")}) ` + (upd.length ? `do update set ${upd.map((c) => `${q(c)} = excluded.${q(c)}`).join(", ")}` : "do nothing");
      }
      sql += retSql;
    } else if (op === "update") {
      const v = body.values;
      if (!v || typeof v !== "object" || Array.isArray(v) || !Object.keys(v).length) throw new HttpError(400, "Qiymatlar noto'g'ri");
      const sets = Object.keys(v).map((c) => {
        if (!known.has(c)) throw new HttpError(400, `Noma'lum ustun: ${c}`);
        if (v[c] !== null && typeof v[c] === "object") throw new HttpError(400, "Qiymat oddiy bo'lishi kerak");
        params.push(v[c]);
        return `${q(c)} = $${params.length}`;
      });
      if (!Array.isArray(body.filters) || !body.filters.length) throw new HttpError(400, "update uchun filtr kerak");
      sql = `update public.${q(table)} set ${sets.join(", ")}${buildWhere(catalog, table, body.filters, params)}${retSql}`;
    } else if (op === "delete") {
      if (!Array.isArray(body.filters) || !body.filters.length) throw new HttpError(400, "delete uchun filtr kerak");
      sql = `delete from public.${q(table)}${buildWhere(catalog, table, body.filters, params)}${retSql}`;
    } else {
      throw new HttpError(400, "Noma'lum amal");
    }

    let result;
    try {
      result = await db.asUser(claims, (c) => c.query(sql, params));
    } catch (e) {
      throw pgError(e) || e;
    }
    const wantsRows = op === "select" || returning;
    let data = wantsRows ? result.rows : null;
    if (wantsRows && body.single) {
      if (body.single === "maybe") {
        if (data.length > 1) throw new HttpError(406, "JSON object requested, multiple rows returned");
        data = data[0] ?? null;
      } else {
        if (data.length !== 1) throw new HttpError(406, "JSON object requested, multiple (or no) rows returned");
        data = data[0];
      }
    }
    return { data, error: null };
  }
  return { execute };
}
