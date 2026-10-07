// Administrator va amaliyot rahbari amallari: xodim yaratish, parol tiklash, faolsizlantirish, talabalar importi.
import { HttpError } from "./errors.js";
import { audit } from "./auth.js";
import { hashPassword } from "./crypto-utils.js";
import {
  CODE_TTL_DAYS, MAX_IMPORT_ROWS, STAFF_ROLES, canManage, cleanStudentRow, formatCode, generateCode, generateTempPassword,
  hashCode, normalizeHemisId, normalizeStaffLogin,
} from "./logic.js";

const NO_PERMISSION = "Bu amal uchun ruxsat yo'q yoki foydalanuvchi topilmadi";

export function createAdmin({ db, config, auth }) {
  async function createStaff(caller, { login, full_name, role }, ctx) {
    if (!STAFF_ROLES.includes(role)) throw new HttpError(400, "Rol noto'g'ri");
    if (!canManage(caller.role, role, "create_staff")) throw new HttpError(403, "Bu amal uchun ruxsat yo'q");
    const l = normalizeStaffLogin(login);
    if (!l) throw new HttpError(400, "Login harf bilan boshlanishi va 3-32 ta belgi (a-z, 0-9, . _ -) bo'lishi kerak");
    const name = String(full_name ?? "").trim().slice(0, 200);
    if (!name) throw new HttpError(400, "F.I.SH kiritilmagan");
    const temp = generateTempPassword();
    const hash = await hashPassword(temp);
    await db.asService(async (c) => {
      const dup = await c.query("select 1 from public.profiles where login = $1", [l]);
      if (dup.rowCount) throw new HttpError(409, "Bu login band");
      const p = await c.query("insert into public.profiles (login, full_name, role) values ($1,$2,$3) returning id", [l, name, role]);
      await c.query("insert into public.credentials (user_id, password_hash, must_change_password) values ($1,$2,true)", [p.rows[0].id, hash]);
      await audit(c, { actorId: caller.id, actorLogin: caller.login, action: "staff_created", target: l, ip: ctx.ip, details: { role } });
    });
    return { ok: true, login: l, temp_password: temp };
  }

  async function findTarget(c, login) {
    const l = String(login ?? "").trim().toLowerCase();
    if (!l) throw new HttpError(400, "Login kiritilmagan");
    return (await c.query("select id, login, role from public.profiles where login = $1", [l])).rows[0] || null;
  }

  async function resetPassword(caller, { login }, ctx) {
    const temp = generateTempPassword();
    const hash = await hashPassword(temp);
    const target = await db.asService(async (c) => {
      const t = await findTarget(c, login);
      // Ruxsat bo'lmasa ham, mavjud bo'lmasa ham bir xil javob: loginlarni terib chiqib bo'lmasin.
      if (!t || !canManage(caller.role, t.role, "reset_password")) throw new HttpError(403, NO_PERMISSION);
      await c.query(
        `insert into public.credentials (user_id, password_hash, must_change_password) values ($1,$2,true)
         on conflict (user_id) do update set password_hash = excluded.password_hash, must_change_password = true,
           failed_attempts = 0, locked_until = null, password_changed_at = now()`, [t.id, hash]);
      await c.query("update public.sessions set revoked_at = now() where user_id = $1 and revoked_at is null", [t.id]);
      await audit(c, { actorId: caller.id, actorLogin: caller.login, action: "password_reset", target: t.login, ip: ctx.ip });
      return t;
    });
    auth.forget(target.id);
    return { ok: true, login: target.login, temp_password: temp };
  }

  async function setActive(caller, { login, active }, ctx) {
    const on = active === true;
    const target = await db.asService(async (c) => {
      const t = await findTarget(c, login);
      if (!t || !canManage(caller.role, t.role, "set_active")) throw new HttpError(403, NO_PERMISSION);
      if (t.id === caller.id) throw new HttpError(400, "O'z hisobingizni o'chira olmaysiz");
      await c.query("update public.profiles set active = $2 where id = $1", [t.id, on]);
      if (!on) await c.query("update public.sessions set revoked_at = now() where user_id = $1 and revoked_at is null", [t.id]);
      await audit(c, { actorId: caller.id, actorLogin: caller.login, action: on ? "user_activated" : "user_deactivated", target: t.login, ip: ctx.ip });
      return t;
    });
    auth.forget(target.id);
    return { ok: true, login: target.login, active: on };
  }

  async function importStudents(caller, body, ctx) {
    if (caller.role !== "admin" && caller.role !== "practice_head") throw new HttpError(403, "Bu amal uchun ruxsat yo'q");
    if (!body || !Array.isArray(body.students)) throw new HttpError(400, "students ro'yxati kerak");
    if (body.students.length === 0) throw new HttpError(400, "Ro'yxat bo'sh");
    if (body.students.length > MAX_IMPORT_ROWS) throw new HttpError(400, `Bir martada ${MAX_IMPORT_ROWS} tadan ko'p qator yuborib bo'lmaydi`);

    // 1) Hammasini tekshiramiz: bitta xato bo'lsa HECH NARSA yozilmaydi.
    const rows = new Map();
    const errors = [];
    body.students.forEach((raw, i) => {
      const { row, error } = cleanStudentRow(raw, i + 1);
      if (error) errors.push(error); else rows.set(row.hemis_id, row); // takror HEMIS ID bo'lsa oxirgisi olinadi
    });
    if (errors.length) throw new HttpError(400, "Faylda xatolar bor", { details: errors.slice(0, 50), total_errors: errors.length });

    const reissue = new Set();
    if (Array.isArray(body.reissue_hemis_ids)) for (const v of body.reissue_hemis_ids) { const h = normalizeHemisId(v); if (h) reissue.add(h); }

    const list = [...rows.values()];
    const col = (k) => list.map((r) => r[k]);

    return db.asService(async (c) => {
      // 2) Talabalarni yozamiz (profile_id va active tegilmaydi: faollashgan talaba aloqasi saqlanadi).
      const up = await c.query(
        `insert into public.students (hemis_id, full_name, group_name, course, faculty, specialty, university, kafedra)
         select * from unnest($1::text[], $2::text[], $3::text[], $4::smallint[], $5::text[], $6::text[], $7::text[], $8::text[])
         on conflict (hemis_id) do update set full_name = excluded.full_name, group_name = excluded.group_name, course = excluded.course,
           faculty = excluded.faculty, specialty = excluded.specialty, university = excluded.university, kafedra = excluded.kafedra
         returning id, hemis_id, full_name, group_name, profile_id, (xmax = 0) as inserted`,
        [col("hemis_id"), col("full_name"), col("group_name"), col("course"), col("faculty"), col("specialty"), col("university"), col("kafedra")]);
      const saved = up.rows;
      const created = saved.filter((s) => s.inserted).length;

      // 3) Faollashmaganlar uchun mavjud kodlarni ko'ramiz.
      const pending = saved.filter((s) => !s.profile_id);
      const codeRows = new Map();
      if (pending.length) {
        const cr = await c.query("select student_id, used_at, expires_at from public.activation_codes where student_id = any($1::uuid[])", [pending.map((s) => s.id)]);
        for (const r of cr.rows) codeRows.set(r.student_id, r);
      }

      // 4) Kerakli talabalarga yangi kod: kodi yo'q, muddati o'tgan, ishlatilgan (lekin hisob yo'q) yoki qayta so'ralgan.
      const now = Date.now();
      const expiresAt = new Date(now + CODE_TTL_DAYS * 86400_000).toISOString();
      const issued = [];
      let kept = 0;
      for (const s of pending) {
        const cr = codeRows.get(s.id);
        const needsNew = !cr || cr.used_at !== null || new Date(cr.expires_at).getTime() < now || reissue.has(s.hemis_id);
        if (!needsNew) { kept++; continue; }
        const code = generateCode(8);
        issued.push({ id: s.id, hash: hashCode(code, s.hemis_id, config.activationPepper), hemis_id: s.hemis_id, full_name: s.full_name, group_name: s.group_name, code: formatCode(code) });
      }
      if (issued.length) {
        await c.query(
          `insert into public.activation_codes (student_id, code_hash, expires_at, attempts, used_at, created_at)
           select id, h, $3::timestamptz, 0, null, now() from unnest($1::uuid[], $2::text[]) as t(id, h)
           on conflict (student_id) do update set code_hash = excluded.code_hash, expires_at = excluded.expires_at, attempts = 0, used_at = null, created_at = now()`,
          [issued.map((i) => i.id), issued.map((i) => i.hash), expiresAt]);
      }
      await audit(c, { actorId: caller.id, actorLogin: caller.login, action: "students_imported", ip: ctx.ip, details: { total: list.length, created, codes_issued: issued.length } });
      return {
        total: list.length, created, updated: list.length - created, already_activated: saved.length - pending.length, kept_existing: kept,
        codes: issued.map(({ hemis_id, full_name, group_name, code }) => ({ hemis_id, full_name, group_name, code })),
      };
    });
  }

  return { createStaff, resetPassword, setActive, importStudents };
}
